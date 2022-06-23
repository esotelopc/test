# -*- coding: utf-8 -*-

from odoo import api, fields, models


class add_to_tour(models.TransientModel):
    _name = "add.to.tour"
    _description = "Add articles to the tour"

    tour_id = fields.Many2one(
        "knowsystem.tour",
        string="Tour",
        required=True,
    )
    articles = fields.Char(string="Articles")

    @api.model
    def create(self, values):
        """
        Overwrite to trigger adding of articles to a tour

        Methods:
         * action_add_to_tour

        Extra info:
         *  we do not use standard wizard buttons in the footer to use standard js forms
        """
        res = super(add_to_tour, self).create(values)
        res.action_add_to_tour()
        return res

    def action_add_to_tour(self):
        """
        The method to select tour and add selected articles to it

        Returns:
         * Action of the tour

        Extra info:
         * we use articles char instead of m2m as ugly hack to avoid default m2m strange behaviour
         * Expected singleton
        """
        self.ensure_one()
        article_ids = self.articles.split(",")
        existing_articles = self.tour_id.tour_article_ids.mapped("article_id.id")
        article_ids = [int(art) for art in article_ids if int(art) not in existing_articles]
        tour_article = self.env["knowsystem.tour.article"]
        max_sequence = self.tour_id.tour_article_ids and self.tour_id.tour_article_ids[-1].sequence + 1 or 0
        for article in article_ids:
            values = {
                "tour_id": self.tour_id.id,
                "article_id": article,
                "sequence": max_sequence,
            }
            new_article = tour_article.create(values)
            max_sequence += 1
