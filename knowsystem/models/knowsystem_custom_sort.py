# -*- coding: utf-8 -*-

from odoo import api, fields, models


class knowsystem_custom_sort(models.Model):
    """
    The model to keep custom sorting values for portal
    """
    _name = "knowsystem.custom.sort"
    _description = "Article Custom Sorting"

    @api.onchange("custom_field_id")
    def _onhcnage_custom_field_id(self):
        """
        Onchnage method for custom_field_id
        """
        for csearch in self:
            csearch.name = csearch.custom_field_id.field_description

    custom_field_id = fields.Many2one(
        "ir.model.fields",
        string="Field",
        required=True,
        domain=[
            ("model", "=", "knowsystem.article"), 
            ("store", "=", True),
            ('ttype', 'not in', ['one2many', 'many2many', 'binary', 'reference', 'serialized']),
        ],
        ondelete="cascade",
    )
    name = fields.Char(
        "Label",
        required=True,
    )
    order_sort = fields.Selection(
        [
            ("asc", "Ascending"),
            ("desc", "Descending"),
        ],
        string="Order",
        required=True,
        default="asc",
    )
