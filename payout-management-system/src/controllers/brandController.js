'use strict';

function makeBrandController({ brandService }) {
  return {
    create(req, res) {
      const { id, name } = req.body;
      const brand = brandService.createBrand({ id, name });
      res.status(201).json(brand);
    },
  };
}

module.exports = makeBrandController;
