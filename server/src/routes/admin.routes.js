'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/admin.controller');
const vendorsAdmin = require('../controllers/adminVendors.controller');
const ridersAdmin = require('../controllers/adminRiders.controller');
const deliveryAdmin = require('../controllers/adminDelivery.controller');
const console_ = require('../controllers/adminCatalog.controller');
const uploads = require('../controllers/upload.controller');
const promos = require('../controllers/promo.controller');
const { singleImage, manyImages } = require('../middlewares/upload');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

// Whole branch is admin-only.
router.use(authenticate(), requireRole('admin'));

router.get('/stats', controller.getStats);
router.get('/orders', controller.listOrders);
router.get('/orders/:id', console_.getOrder);

router.get('/audit', controller.listAudit);

router.patch(
  '/orders/:id/status',
  [
    body('status')
      .isIn(['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
  validate,
  controller.setOrderStatus,
);

/* Manual dispatch - assign a delivery partner from the console. */
router.get('/delivery/tasks', deliveryAdmin.listTasks);
router.get('/delivery/tasks/:id', deliveryAdmin.getTask);
router.get('/delivery/riders', deliveryAdmin.assignableRiders);
router.post('/delivery/tasks/:id/assign', deliveryAdmin.assignTaskToRider);
router.post('/orders/:id/assign-rider', deliveryAdmin.assignOrderRider);

router.get('/partners', controller.listPartners);
router.patch(
  '/partners/:userId',
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
    body('note').optional({ values: 'falsy' }).isString().isLength({ max: 300 }).withMessage('Note too long'),
  ],
  validate,
  controller.decidePartner,
);

/* ------------------------------------------------------------------ *
 * Vendor KYC (mobile VendorApp) and delivery-partner KYC (RiderApp).
 * ------------------------------------------------------------------ */
router.get('/vendors', vendorsAdmin.listVendors);
router.get('/vendors/:id', vendorsAdmin.getVendor);
router.patch('/vendors/:id', vendorsAdmin.decide);
router.patch('/vendors/:id/documents', vendorsAdmin.verifyDoc);

router.get('/riders', ridersAdmin.listRiders);
router.get('/riders/:id', ridersAdmin.getRider);
router.patch('/riders/:id', ridersAdmin.decide);
router.patch('/riders/:id/documents', ridersAdmin.verifyDoc);
router.patch('/riders/:id/cod-deposits/:depositId', ridersAdmin.confirmCodDeposit);

/* ------------------------------------------------------------------ *
 * Admin panel (admin/) - customers, reports, catalogue CRUD.
 * ------------------------------------------------------------------ */

router.get('/customers', console_.listCustomers);
router.get('/customers/:id', console_.getCustomer);
router.patch('/customers/:id', console_.setCustomerRole);
router.post('/customers/:id/wallet', console_.adjustWallet);
router.post('/customers/:id/loyalty', console_.adjustLoyalty);

router.get('/reports/overview', console_.reportOverview);
router.get('/lookups', console_.lookups);
router.get('/system', console_.systemInfo);

// Image uploads - multer writes to this server's own `uploads/` directory.
router.post('/uploads', singleImage, uploads.uploadImage);
router.post('/uploads/bulk', manyImages, uploads.uploadImages);
router.delete('/uploads/:bucket/:file', uploads.deleteUpload);

// Promo codes - CRUD comes from the catalogue loop below, these are the extras.
router.post('/promos/:id/issue', promos.issuePromo);
router.get('/promos/:id/stats', promos.promoStats);

// Catalogue CRUD - one identical REST surface per resource.
for (const [path, handlers] of Object.entries(console_.resources)) {
  router.get(`/${path}`, handlers.list);
  router.post(`/${path}`, handlers.create);
  router.get(`/${path}/:id`, handlers.getOne);
  router.put(`/${path}/:id`, handlers.update);
  router.patch(`/${path}/:id`, handlers.update);
  router.delete(`/${path}/:id`, handlers.remove);
}

module.exports = router;
