'use strict';

const Order = require('../models/Order');
const DeliveryTask = require('../models/DeliveryTask');
const DeliveryPartner = require('../models/DeliveryPartner');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { docsComplete, profileComplete, emptyDocs } = require('../utils/riderDocs');
const { completeDeliveryTask } = require('../utils/delivery');
const { describeUpload } = require('./upload.controller');

const OFFER_TTL_MS = 30 * 1000;
const ACTIVE_TASK_STATES = ['accepted', 'at_pickup', 'picked_up', 'at_drop'];

async function loadRider(req) {
  const rider = await DeliveryPartner.findOne({ userId: req.user.id });
  if (!rider) throw ApiError.notFound('Delivery partner profile missing', 'RIDER_MISSING');
  return rider;
}

function requireApproved(rider) {
  if (rider.status !== 'approved') {
    throw ApiError.forbidden('Go live only after admin verifies every document', 'NOT_APPROVED');
  }
}

function publicTask(task) {
  const json = task.toJSON ? task.toJSON() : { ...task };
  // Customer OTPs are entered by the rider after the customer shares them;
  // never send the secrets in offers, maps, history or active-task payloads.
  if (json.pickup) json.pickup = { ...json.pickup, otp: '' };
  if (json.drop) json.drop = { ...json.drop, otp: '' };
  delete json.rejectedBy;
  return json;
}

/** GET /api/v1/rider/me */
const getMe = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  return ok(res, { rider });
});

/** PATCH /api/v1/rider/onboarding */
const updateOnboarding = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  if (['approved', 'suspended'].includes(rider.status)) {
    throw ApiError.forbidden('Live profiles are locked', 'PROFILE_LOCKED');
  }
  const fields = [
    'name', 'email', 'city', 'pincode', 'address', 'vehicleType', 'vehicleNumber',
    'pan', 'aadhaar', 'drivingLicense', 'rcNumber', 'trainingCompleted', 'quizCompleted',
  ];
  for (const key of fields) {
    if (req.body[key] !== undefined) rider[key] = req.body[key];
  }
  if (req.body.bank && typeof req.body.bank === 'object') {
    rider.bank = { ...(rider.bank.toObject?.() || rider.bank), ...req.body.bank };
  }
  if (req.body.referralCode !== undefined) {
    rider.referralCode = String(req.body.referralCode || '').trim().toUpperCase().slice(0, 12);
  }
  if (rider.status === 'needs_info' || rider.status === 'rejected') rider.status = 'onboarding';
  await rider.save();
  return ok(res, { rider });
});

/** PATCH /api/v1/rider/documents */
const setDocument = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  if (rider.status === 'suspended') throw ApiError.forbidden('Account suspended', 'SUSPENDED');
  const { key, uri, label } = req.body;
  if (!key) throw ApiError.badRequest('Document key required', 'DOC_KEY');
  if (!rider.documents.length) rider.documents = emptyDocs();
  const idx = rider.documents.findIndex((d) => d.key === key);
  if (idx < 0) {
    rider.documents.push({ key, label: label || key, uri: uri || '', verified: false, note: '' });
  } else {
    rider.documents[idx].uri = uri || '';
    rider.documents[idx].verified = false;
    rider.documents[idx].note = '';
    if (label) rider.documents[idx].label = label;
  }
  if (rider.status === 'needs_info' || rider.status === 'rejected') rider.status = 'onboarding';
  await rider.save();
  return ok(res, { rider });
});

/** POST /api/v1/rider/submit */
const submit = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  if (rider.status === 'approved') return ok(res, { rider });
  if (rider.status === 'suspended') throw ApiError.forbidden('Account suspended', 'SUSPENDED');
  if (!profileComplete(rider)) {
    throw ApiError.badRequest('Fill personal, vehicle and bank details before submitting', 'PROFILE_INCOMPLETE');
  }
  if (!docsComplete(rider)) {
    throw ApiError.badRequest('Upload every required document before submitting', 'DOCS_INCOMPLETE');
  }
  if (!rider.trainingCompleted || !rider.quizCompleted) {
    throw ApiError.badRequest('Complete rider training and the safety quiz before submitting', 'TRAINING_INCOMPLETE');
  }
  rider.status = 'submitted';
  rider.submittedAt = new Date();
  rider.reviewNote = '';
  await rider.save();
  return ok(res, { rider });
});

/** PATCH /api/v1/rider/duty { state } */
const setDuty = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const { state } = req.body;
  if (!['online', 'offline', 'break'].includes(state)) {
    throw ApiError.badRequest('Invalid duty state', 'INVALID_DUTY_STATE');
  }
  if (state === 'offline' || state === 'break') {
    const activeTask = await DeliveryTask.exists({ riderId: rider.id, state: { $in: ACTIVE_TASK_STATES } });
    if (activeTask || rider.dutyState === 'on_task') {
      throw ApiError.badRequest('Finish your active delivery before changing duty', 'ACTIVE_TASK_EXISTS');
    }
  }
  if (state === 'online' && rider.codInHand >= rider.maxCodLimit) {
    throw ApiError.badRequest(
      `COD in hand ₹${Math.round(rider.codInHand)} has crossed your ₹${Math.round(rider.maxCodLimit)} limit. Deposit cash before going online.`,
      'COD_LIMIT_EXCEEDED',
    );
  }
  const update = { $set: { dutyState: state } };
  if (state === 'online') {
    const today = new Date().toISOString().slice(0, 10);
    if (rider.currentDayDate !== today) {
      update.$set.currentDayDate = today;
      update.$set.currentDayTrips = 0;
      update.$set.currentDayEarnings = 0;
    }
  }
  // Keep the duty transition atomic with the accept lock. A stale device must
  // never flip an active rider back to offline/break while a delivery runs.
  const updated = await DeliveryPartner.findOneAndUpdate(
    { id: rider.id, status: 'approved', dutyState: { $ne: 'on_task' } },
    update,
    { new: true },
  );
  if (!updated) {
    throw ApiError.badRequest('Finish your active delivery before changing duty', 'ACTIVE_TASK_EXISTS');
  }
  return ok(res, { rider: updated });
});

/** POST /api/v1/rider/location/batch [{lat,lng,at,accuracy,speed}] */
const locationBatch = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  if (!['online', 'on_task'].includes(rider.dutyState)) {
    throw ApiError.badRequest('Location updates are accepted only while on duty', 'RIDER_OFFLINE');
  }
  const points = Array.isArray(req.body) ? req.body : req.body.points;
  if (!Array.isArray(points) || !points.length) {
    throw ApiError.badRequest('Send a points array', 'NO_POINTS');
  }
  const last = points[points.length - 1];
  if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
    rider.lastLat = Number(last.lat);
    rider.lastLng = Number(last.lng);
    rider.lastPingAt = new Date(last.at || Date.now());
    await rider.save();
  }
  return ok(res, { received: points.length, rider });
});

/** GET /api/v1/rider/offers?lat=&lng= */
const getOffers = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  // First look at an in-flight task so the home screen can surface it too,
  // including while the rider is `on_task` (not just while waiting online).
  const activeTask = await DeliveryTask.findOne({
    riderId: rider.id,
    state: { $in: ['accepted', 'at_pickup', 'picked_up', 'at_drop'] },
  }).sort({ createdAt: -1 });

  if (rider.dutyState !== 'online') {
    return ok(res, { offers: [], activeTask: activeTask ? publicTask(activeTask) : null, dutyState: rider.dutyState, codInHand: rider.codInHand, maxCodLimit: rider.maxCodLimit });
  }

  const offers = await DeliveryTask.find({
    state: 'available',
    riderId: { $in: [null, ''] },
    rejectedBy: { $ne: rider.id },
    createdAt: { $gte: new Date(Date.now() - OFFER_TTL_MS) },
  })
    .sort({ createdAt: 1 })
    .limit(30);

  const eligibleOffers = offers.filter(
    (offer) => Number(rider.codInHand || 0) + Number(offer.codAmount || 0) <= Number(rider.maxCodLimit || 0),
  );
  return ok(res, {
    offers: eligibleOffers.map(publicTask),
    activeTask: activeTask ? publicTask(activeTask) : null,
    dutyState: rider.dutyState,
    codInHand: rider.codInHand,
    maxCodLimit: rider.maxCodLimit,
  });
});

/** POST /api/v1/rider/tasks/:id/accept */
const acceptTask = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const existingTask = await DeliveryTask.exists({ riderId: rider.id, state: { $in: ['accepted', 'at_pickup', 'picked_up', 'at_drop'] } });
  if (existingTask) throw ApiError.conflict('Finish your active delivery before accepting another one', 'ACTIVE_TASK_EXISTS');
  const task = await DeliveryTask.findOne({ id: req.params.id });
  if (!task) throw ApiError.notFound('Task not found', 'TASK_NOT_FOUND');
  if (task.state === 'available' && Date.now() - new Date(task.createdAt).getTime() > OFFER_TTL_MS) {
    throw ApiError.badRequest('This delivery offer has expired', 'OFFER_EXPIRED');
  }
  if (Number(rider.codInHand || 0) + Number(task.codAmount || 0) > Number(rider.maxCodLimit || 0)) {
    throw ApiError.badRequest('Deposit COD cash before accepting this delivery', 'COD_LIMIT_EXCEEDED');
  }

  // Claim the rider slot and the task independently. The rider update is an
  // atomic online → on_task lock, which prevents two devices for the same
  // partner from accepting two deliveries at the same time.
  const riderLock = await DeliveryPartner.findOneAndUpdate(
    { id: rider.id, status: 'approved', dutyState: 'online' },
    {
      $set: { dutyState: 'on_task' },
      $inc: { offerCount: 1, acceptanceCount: 1 },
    },
    { new: true },
  );
  if (!riderLock) {
    const current = await DeliveryPartner.findOne({ id: rider.id }).select('dutyState');
    if (current?.dutyState === 'on_task') {
      throw ApiError.conflict('Finish your active delivery before accepting another one', 'ACTIVE_TASK_EXISTS');
    }
    throw ApiError.badRequest('Go online before accepting a delivery', 'RIDER_OFFLINE');
  }

  // Atomic task claim - first rider wins. If the offer disappeared after the
  // rider lock, release the lock so the rider can continue receiving offers.
  const claimed = await DeliveryTask.findOneAndUpdate(
    { id: req.params.id, state: 'available', riderId: { $in: [null, ''] } },
    {
      $set: {
        state: 'accepted',
        riderId: rider.id,
        riderName: rider.name || req.user.name,
        riderPhone: rider.phone,
        acceptedAt: new Date(),
      },
    },
    { new: true },
  );
  if (!claimed) {
    await DeliveryPartner.updateOne(
      { id: rider.id, dutyState: 'on_task' },
      { $set: { dutyState: 'online' }, $inc: { offerCount: -1, acceptanceCount: -1 } },
    );
    throw ApiError.conflict('This delivery was taken by another partner', 'ORDER_TAKEN');
  }
  return ok(res, { task: publicTask(claimed) });
});

/** POST /api/v1/rider/tasks/:id/reject { reason? } */
const rejectTask = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const task = await DeliveryTask.findOne({ id: req.params.id, state: 'available' });
  if (!task) throw ApiError.notFound('Task not found or already taken', 'TASK_NOT_FOUND');
  if (!task.rejectedBy.includes(rider.id)) task.rejectedBy.push(rider.id);
  task.note = task.note || String(req.body.reason || '').slice(0, 120);
  await task.save();
  rider.offerCount = Number(rider.offerCount || 0) + 1;
  await rider.save();
  return ok(res, { rejected: true });
});

/** GET /api/v1/rider/tasks/:id - task detail for the map preview and active flow. */
const getTask = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const task = await DeliveryTask.findOne({
    id: req.params.id,
    $or: [{ riderId: rider.id }, { state: 'available', riderId: { $in: [null, ''] } }],
  });
  if (!task) throw ApiError.notFound('Task not found or no longer available', 'TASK_NOT_FOUND');
  return ok(res, { task: publicTask(task) });
});

/** GET /api/v1/rider/tasks/active */
const getActiveTask = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const task = await DeliveryTask.findOne({
    riderId: rider.id,
    state: { $in: ['accepted', 'at_pickup', 'picked_up', 'at_drop'] },
  }).sort({ createdAt: -1 });
  if (!task) return ok(res, { task: null });
  return ok(res, { task: publicTask(task) });
});

/** POST /api/v1/rider/tasks/:id/arrived-pickup */
const arrivedPickup = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const task = await DeliveryTask.findOneAndUpdate(
    { id: req.params.id, riderId: rider.id, state: 'accepted' },
    { $set: { state: 'at_pickup', arrivedPickupAt: new Date() } },
    { new: true },
  );
  if (!task) throw ApiError.notFound('Task not found or already advanced', 'TASK_NOT_FOUND');
  return ok(res, { task: publicTask(task) });
});

/** POST /api/v1/rider/tasks/:id/pickup { otp } */
const pickupOtp = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const { otp } = req.body;
  const task = await DeliveryTask.findOne({ id: req.params.id, riderId: rider.id });
  if (!task) throw ApiError.notFound('Task not found', 'TASK_NOT_FOUND');
  if (task.state !== 'at_pickup' && task.state !== 'accepted') {
    throw ApiError.badRequest('Pickup OTP must be taken after arriving', 'INVALID_STATE');
  }
  if (String(task.pickup?.otp || '') !== String(otp || '').trim()) {
    throw ApiError.badRequest('Invalid pickup OTP', 'OTP_INVALID');
  }
  task.state = 'picked_up';
  task.pickedUpAt = new Date();
  await task.save();
  return ok(res, { task: publicTask(task) });
});

/** POST /api/v1/rider/tasks/:id/arrived-drop */
const arrivedDrop = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const task = await DeliveryTask.findOneAndUpdate(
    { id: req.params.id, riderId: rider.id, state: 'picked_up' },
    { $set: { state: 'at_drop', arrivedDropAt: new Date() } },
    { new: true },
  );
  if (!task) throw ApiError.notFound('Task not found or not picked up yet', 'TASK_NOT_FOUND');
  return ok(res, { task: publicTask(task) });
});

/** POST /api/v1/rider/tasks/:id/deliver { otp, podUrl?, note? } */
const deliver = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const { otp, podUrl = '', note = '' } = req.body;

  const task = await DeliveryTask.findOne({ id: req.params.id, riderId: rider.id });
  if (!task) throw ApiError.notFound('Task not found', 'TASK_NOT_FOUND');
  if (task.state !== 'at_drop') {
    throw ApiError.badRequest('Mark arrived at drop before delivery', 'INVALID_STATE');
  }
  if (String(task.drop?.otp || '') !== String(otp || '').trim()) {
    throw ApiError.badRequest('Invalid drop OTP from the customer', 'OTP_INVALID');
  }
  const requiresPod = Number(task.total || 0) >= 2000 || String(task.note || '').toLowerCase().includes('leave at door');
  if (requiresPod && !String(podUrl).trim()) {
    throw ApiError.badRequest('Add a proof-of-delivery photo for this order', 'POD_REQUIRED');
  }

  const codAmount = Number(task.codAmount) || 0;
  if (codAmount > 0 && rider.codInHand + codAmount > rider.maxCodLimit) {
    throw ApiError.badRequest(
      `COD ₹${Math.round(codAmount)} would take you over ₹${Math.round(rider.maxCodLimit)} in hand. Deposit before taking COD deliveries.`,
      'COD_LIMIT_EXCEEDED',
    );
  }

  const result = await completeDeliveryTask(task, { rider, podUrl, note });
  return ok(res, { task: publicTask(result.task), orderCode: result.order.code });
});

/** POST /api/v1/rider/tasks/:id/fail { reason, note? } */
const failTask = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const task = await DeliveryTask.findOne({ id: req.params.id, riderId: rider.id });
  if (!task) throw ApiError.notFound('Task not found', 'TASK_NOT_FOUND');
  if (['delivered', 'failed', 'cancelled'].includes(task.state)) {
    throw ApiError.badRequest('Task already finished', 'TASK_FINISHED');
  }
  task.state = 'failed';
  task.failReason = String(req.body.reason || '').slice(0, 120);
  task.note = String(req.body.note || '').slice(0, 200);
  if (rider.dutyState === 'on_task') rider.dutyState = 'online';
  await Promise.all([task.save(), rider.save()]);
  return ok(res, { task: publicTask(task) });
});

/** GET /api/v1/rider/tasks?status=&page=&limit= */
const listTasks = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const { status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 80 });
  const query = { riderId: rider.id, state: { $ne: 'available' } };
  if (status === 'running') {
    query.state = { $in: ['accepted', 'at_pickup', 'picked_up', 'at_drop'] };
  } else if (['delivered', 'failed', 'cancelled', 'accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(status)) {
    query.state = status;
  }
  const total = await DeliveryTask.countDocuments(query);
  const tasks = await DeliveryTask.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return ok(res, { tasks: tasks.map(publicTask) }, listMeta(total, page, limit));
});

/** GET /api/v1/rider/earnings?range=today|week|all */
const earnings = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const range = ['today', 'week', 'all'].includes(req.query.range) ? req.query.range : 'today';
  const now = new Date();
  const start = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(2000, 0, 1);
  }

  const tasks = await DeliveryTask.find({
    riderId: rider.id,
    state: 'delivered',
    deliveredAt: { $gte: start, $lte: now },
  }).sort({ deliveredAt: -1 });

  const payout = tasks.reduce((sum, t) => sum + Number(t.riderPayout || 0), 0);
  const cod = tasks.reduce((sum, t) => sum + Number(t.codAmount || 0), 0);
  const incentiveRows = computeIncentives(tasks.length);
  const incentives = incentiveRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return ok(res, {
    range,
    trips: tasks.length,
    payout,
    codCollected: cod,
    incentives,
    incentiveRows,
    total: Math.round((payout + incentives) * 100) / 100,
    tasks: tasks.slice(0, 50).map(publicTask),
  });
});

function computeIncentives(trips) {
  const rows = [];
  if (trips >= 5) rows.push({ id: 'trips_5', title: '5 trips completed', points: 0, amount: 30 });
  if (trips >= 10) rows.push({ id: 'trips_10', title: '10 trips completed', points: 0, amount: 80 });
  if (trips >= 15) rows.push({ id: 'trips_15', title: '15 trips completed', points: 0, amount: 150 });
  return rows;
}

/** GET /api/v1/rider/leaderboard */
const leaderboard = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const [leaders, ahead] = await Promise.all([
    DeliveryPartner.find({ status: 'approved' }).sort({ totalTrips: -1, rating: -1, totalEarnings: -1 }).limit(20).select('id name totalTrips rating ratingCount'),
    DeliveryPartner.countDocuments({
      status: 'approved',
      $or: [
        { totalTrips: { $gt: Number(rider.totalTrips || 0) } },
        {
          totalTrips: Number(rider.totalTrips || 0),
          rating: { $gt: Number(rider.rating || 0) },
        },
        {
          totalTrips: Number(rider.totalTrips || 0),
          rating: Number(rider.rating || 0),
          totalEarnings: { $gt: Number(rider.totalEarnings || 0) },
        },
      ],
    }),
  ]);
  return ok(res, {
    rank: ahead + 1,
    riders: leaders.map((item) => ({ id: item.id, name: item.name, trips: item.totalTrips, rating: item.rating, ratingCount: item.ratingCount })),
  });
});

/** GET /api/v1/rider/payouts */
const payouts = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const tasks = await DeliveryTask.find({ riderId: rider.id, state: 'delivered' }).sort({ deliveredAt: -1 }).limit(100);
  return ok(res, {
    balance: rider.payoutBalance,
    codInHand: rider.codInHand,
    totalEarnings: rider.totalEarnings,
    totalTrips: rider.totalTrips,
    history: tasks.map((t) => ({
      id: t.id,
      code: t.code,
      orderCode: t.orderCode,
      amount: t.riderPayout,
      codAmount: t.codAmount,
      deliveredAt: t.deliveredAt,
    })),
    deposits: rider.codDeposits,
  });
});

/** POST /api/v1/rider/cod/deposit { amount, method?, refId? } */
const codDeposit = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  requireApproved(rider);
  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) throw ApiError.badRequest('Enter a valid deposit amount', 'INVALID_AMOUNT');
  if (amount > rider.codInHand) {
    throw ApiError.badRequest(`You have only ₹${Math.round(rider.codInHand)} in hand`, 'INSUFFICIENT_COD');
  }
  const method = ['upi', 'hub', 'bank'].includes(req.body.method) ? req.body.method : 'upi';
  rider.codInHand = Math.max(0, Math.round((rider.codInHand - amount) * 100) / 100);
  rider.codDeposits = rider.codDeposits || [];
  rider.codDeposits.push({
    id: newId('dep'),
    amount,
    method,
    refId: String(req.body.refId || '').slice(0, 80),
    status: 'pending',
  });
  await rider.save();
  return created(res, { rider });
});

/** GET /api/v1/rider/incentives */
const incentives = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayTrips = await DeliveryTask.countDocuments({
    riderId: rider.id,
    state: 'delivered',
    deliveredAt: { $gte: start },
  });
  return ok(res, { todayTrips, rows: computeIncentives(todayTrips) });
});

/** POST /api/v1/rider/sos { lat, lng, type?, note? } */
const sos = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  rider.incidents = rider.incidents || [];
  rider.incidents.push({
    id: newId('sos'),
    type: String(req.body.type || 'sos').slice(0, 40),
    lat: req.body.lat != null ? Number(req.body.lat) : null,
    lng: req.body.lng != null ? Number(req.body.lng) : null,
    note: String(req.body.note || '').slice(0, 300),
  });
  await rider.save();
  return created(res, { rider });
});

/** POST /api/v1/rider/push-token */
const pushToken = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  rider.pushToken = String(req.body.token || '').slice(0, 300);
  await rider.save();
  return ok(res, { rider });
});

/** POST /api/v1/rider/issues */
const raiseIssue = asyncHandler(async (req, res) => {
  const rider = await loadRider(req);
  const { title, body } = req.body;
  if (!title) throw ApiError.badRequest('Title required', 'TITLE_REQUIRED');
  rider.issues = rider.issues || [];
  rider.issues.push({
    id: newId('iss'),
    title: String(title).slice(0, 120),
    body: String(body || '').slice(0, 800),
    status: 'open',
  });
  await rider.save();
  return created(res, { rider });
});

/** POST /api/v1/rider/uploads */
const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image received', 'NO_FILE');
  return ok(res, describeUpload(req, req.file), undefined, 201);
});

module.exports = {
  getMe,
  updateOnboarding,
  setDocument,
  submit,
  setDuty,
  locationBatch,
  getOffers,
  getTask,
  acceptTask,
  rejectTask,
  getActiveTask,
  arrivedPickup,
  pickupOtp,
  arrivedDrop,
  deliver,
  failTask,
  listTasks,
  earnings,
  leaderboard,
  payouts,
  codDeposit,
  incentives,
  sos,
  pushToken,
  raiseIssue,
  upload,
};
