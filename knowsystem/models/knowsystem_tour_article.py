# -*- coding: utf-8 -*-

from odoo import fields, models


class knowsystem_tour_article(models.Model):
    """
    The model to link tour and articles
    """
    _name = "knowsystem.tour.article"
    _description = "Article"

    article_id = fields.Many2one(
        "knowsystem.article",
        string="Article",
        required=True,
    )
    tour_id = fields.Many2one(
        "knowsystem.tour",
        string="Tour",
    )
    sequence = fields.Integer(
        string="Sequence",
        default=0,
    )
    done_by_user_ids = fields.Many2many(
        "res.users",
        "knowsystem_tour_res_users_rel_table",
        "knowsystem_tour_rel_id",
        "res_users_rel_id",
        string="Done by users",
    )

    _order = "sequence, id"
