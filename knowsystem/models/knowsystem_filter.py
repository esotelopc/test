# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.tools.safe_eval import safe_eval


class knowsystem_filter(models.Model):
    """
    The model to apply articles for definite Odoo documents
    """
    _name = "knowsystem.filter"
    _description = "Document"

    def _return_model(self):
        """
        The method to return available models
        """
        self._cr.execute("SELECT model, name FROM ir_model ORDER BY name")
        return self._cr.fetchall()

    @api.onchange("model")
    def _onchange_model(self):
        """
        Onchange method for model to clean domain
        """
        for doc_filter in self:
            doc_filter.domain = "[]"

    model = fields.Selection(
        _return_model,
        string='Model',
        required=True,
    )
    domain = fields.Text(
        string="Applied Filters",
        default="[]",
        required=True,
    )
    tag_id = fields.Many2one(
        "knowsystem.tag",
        string="Tag",
    )

    def name_get(self):
        """
        Overloading the method, to reflect parent's name recursively
        """
        result = []
        for doc_filter in self:
            name = u"{} ({})".format(
                doc_filter.model,
                doc_filter.tag_id and doc_filter.tag_id.name or "",
            )
            result.append((doc_filter.id, name))
        return result

    @api.model
    def _check_document(self, res_id):
        """
        The method to check whether this document suits this filter

        Args:
         * res_id - id of the document

        Returns:
         * bool
        """
        domain = [("id", "=", res_id)]
        filter_domain = self.domain and safe_eval(self.domain) or []
        domain += filter_domain
        suits = self.env[self.model].search(domain, limit=1)
        return suits and True or False
