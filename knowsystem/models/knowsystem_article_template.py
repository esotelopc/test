# -*- coding: utf-8 -*-

from odoo import fields, models


class knowsystem_article_template(models.Model):
    """
    The model to keep default articles structures
    """
    _name = "knowsystem.article.template"
    _description = "Article Template"

    name = fields.Char(
        string="Name",
        required=True,
        translate=False,
    )
    description = fields.Html(
        string="Article",
        translate=False,
        sanitize=False,
    )
    description_arch = fields.Html(
        string='Body', 
        translate=False,
        sanitize=False,
    )    
    active = fields.Boolean(
        string="Active",
        default=True,
        help="Uncheck to archive",
    )
    sequence = fields.Integer(
        string="Sequence",
        help="The lesser the closer to the top",
    )
