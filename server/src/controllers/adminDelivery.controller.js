'use strict';

const Order = require('../models/Order');
const DeliveryTask = require('../models/DeliveryTask');
const DeliveryPartner = require('../models/DeliveryPartner');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { createDeliveryTaskForOrder } = require('../utils/delivery');
const { writeAudit } = require('../utils/audit');

function taskView(task) {
  const json = task.toJSON ? task.toJSON() : { ...task };
  return json;
}

/** GET /api/v1/admin/delivery/tasks?state=&page= */
const listTasks = asyncHandler(async (req, res) => {
  const { state } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 100 });
  const query = {};
  if (state) query.state = state;
  const total = await DeliveryTask.countDocuments(query);
  const tasks = await DeliveryTask.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return ok(res, { tasks: tasks.map(taskView) }, listMeta(total, page, limit));
});

/** GET /api/v1/admin/delivery/tasks/:id */
const getTask = asyncHandler(async (req, res) => {
  const task = await DeliveryTask.findOne({ id: req.params.id });
  if (!task) throw ApiError.notFound('Delivery task not found', 'TASK_NOT_FOUND');
  return ok(res, { task: taskView(task) });
});

/** GET /api/v1/admin/delivery/riders — approved riders available for manual assignment. */
const assignableRiders = asyncHandler(async (req, res) => {
  const rows = await DeliveryPartner.find({
    status: 'approved',
    dutyState: { $nin: ['offline'] },
  })
    .sort({ currentDayTrips: 1, updatedAt: -1 })
    .limit(50);

  const active = await DeliveryTask.find({
    state: { $in: ['accepted', 'at_pickup', 'picked_up', 'at_drop'] },
  }).select('riderId state orderCode').lean();

  const activeByRider = new Map(active.map((t) => [t.riderId, t]));

  return ok(res, {
    riders: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      vehicleType: r.vehicleType,
      vehicleNumber: r.vehicleNumber,
      dutyState: r.dutyState,
      codInHand: r.codInHand,
      maxCodLimit: r.maxCodLimit,
      currentDayTrips: r.currentDayTrips,
      activeTask: activeByRider.get(r.id) || null,
    })),
  });
});

async function assignTask(req, task, rider) {
  const claimed = await DeliveryTask.findOneAndUpdate(
    { id: task.id, state: 'available' },
    {
      $set: {
        state: 'accepted',
        riderId: rider.id,
        riderName: rider.name,
        riderPhone: rider.phone,
        acceptedAt: new Date(),
      },
    },
    { new: true },
  );
  if (!claimed) {
    throw ApiError.conflict('This delivery was already assigned or taken', 'ORDER_TAKEN');
  }
  rider.dutyState = 'on_task';
  rider.offerCount = Number(rider.offerCount || 0) + 1;
  rider.acceptanceCount = Number(rider.acceptanceCount || 0) + 1;
  await rider.save();
  await writeAudit({
    actor: req.user,
    action: 'delivery.assign',
    targetType: 'delivery_task',
    targetId: task.id,
    targetCode: task.orderCode,
    detail: `Assigned to ${rider.name} (${rider.phone})`,
    req,
  });
  return claimed;
}

/** POST /api/v1/admin/delivery/tasks/:id/assign { riderId } */
const assignTaskToRider = asyncHandler(async (req, res) => {
  const task = await DeliveryTask.findOne({ id: req.params.id });
  if (!task) throw ApiError.notFound('Delivery task not found', 'TASK_NOT_FOUND');
  if (task.state !== 'available') {
    throw ApiError.badRequest(`Task is already ${task.state}`, 'TASK_TAKEN');
  }
  const rider = await DeliveryPartner.findOne({ id: req.body.riderId });
  if (!rider || rider.status !== 'approved') {
    throw ApiError.badRequest('Pick an approved delivery partner', 'RIDER_NOT_APPROVED');
  }
  const codAmount = Number(task.codAmount) || 0;
  if (codAmount > 0 && rider.codInHand + codAmount > rider.maxCodLimit) {
    throw ApiError.badRequest(
      `Rider has ₹${Math.round(rider.codInHand)} COD in hand; assigning ${rider.name} would cross their limit`,
      'COD_LIMIT_EXCEEDED',
    );
  }
  const assigned = await assignTask(req, task, rider);
  return ok(res, { task: taskView(assigned) });
});

/** POST /api/v1/admin/orders/:id/assign-rider { riderId } */
const assignOrderRider = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status !== 'out_for_delivery') {
    throw ApiError.badRequest('Move the order to out_for_delivery before assigning a rider', 'NOT_READY');
  }
  const rider = await DeliveryPartner.findOne({ id: req.body.riderId });
  if (!rider || rider.status !== 'approved') {
    throw ApiError.badRequest('Pick an approved delivery partner', 'RIDER_NOT_APPROVED');
  }
  const task = await createDeliveryTaskForOrder(order);
  if (task.state !== 'available') {
    throw ApiError.badRequest(`Task is already ${task.state}`, 'TASK_TAKEN');
  }
  const codAmount = Number(task.codAmount) || 0;
  if (codAmount > 0 && rider.codInHand + codAmount > rider.maxCodLimit) {
    throw ApiError.badRequest(
      `Rider has ₹${Math.round(rider.codInHand)} COD in hand; assigning ${rider.name} would cross their limit`,
      'COD_LIMIT_EXCEEDED',
    );
  }
  const assigned = await assignTask(req, task, rider);
  return ok(res, { task: taskView(assigned), orderId: order.id });
});

module.exports = { listTasks, getTask, assignableRiders, assignTaskToRider, assignOrderRider };
