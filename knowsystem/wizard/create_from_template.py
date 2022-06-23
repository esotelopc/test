# -*- coding: utf-8 -*-

from odoo import api, fields, models


class create_from_template(models.TransientModel):
    _name = "create.from.template"
    _description = "Create From Template"

    template_id = fields.Many2one(
        "knowsystem.article.template",
        string="Template",
        required=True,
    )

    def action_create_from_template(self):
        """
        The method to open new article form with structured from template description

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        action_id = self.sudo().env.ref("knowsystem.knowsystem_article_action_form_only")
        action = action_id.read()[0]
        action["context"] = {"default_knowdescription": self.template_id.description_arch}
        return action
