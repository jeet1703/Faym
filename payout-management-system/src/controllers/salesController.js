'use strict';

function makeSalesController({ saleService }) {
  return {
    create(req, res) {
      const { userId, brandId, earning } = req.body;
      const sale = saleService.createSale({ userId, brandId, earning });
      res.status(201).json(sale);
    },

    listForUser(req, res) {
      const sales = saleService.listForUser(req.params.userId);
      res.json(sales);
    },
  };
}

module.exports = makeSalesController;
