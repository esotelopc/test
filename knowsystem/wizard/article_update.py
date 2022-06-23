# -*- coding: utf-8 -*-

from odoo import api, fields, models


class article_update(models.TransientModel):
    """
    The model to keep attributes of mass update
    """
    _name = "article.update"
    _description = "Update Article"

    articles = fields.Char(string="Updated articles",)
    section_id = fields.Many2one(
        "knowsystem.section",
        string="Update section",
    )
    to_add_tag_ids = fields.Many2many(
        "knowsystem.tag",
        "knowsystem_tag_article_update_add_rel_table",
        "knowsystem_tag_add_id",
        "article_add_tag_id",
        string="Add tags",
    )
    to_remove_tag_ids = fields.Many2many(
        "knowsystem.tag",
        "knowsystem_tag_article_update_remove_rel_table",
        "knowsystem_tag_remove_id",
        "article_add_remove_id",
        string="Remove tags",
    )
    activate = fields.Selection(
        [
            ("activate", "Restore"),
            ("archive", "Archive"),
        ],
        string="Update state",
    )

    @api.model
    def create(self, values):
        """
        Overwrite to trigger articles update

        Methods:
         * action_update_articles

        Extra info:
         *  we do not use standard wizard buttons in the footer to use standard js forms
        """
        res = super(article_update, self).create(values)
        res.action_update_articles()
        return res

    def action_update_articles(self):
        """
        The method update articles

        Methods:
         * _prepare_values

        Extra info:
         * we use articles char instead of m2m as ugly hack to avoid default m2m strange behaviour
         * Expected singleton
        """
        self.ensure_one()
        values = self._prepare_values()
        if values:
            article_ids = self.articles.split(",")
            article_ids = [int(art) for art in article_ids]
            article_ids = self.env["knowsystem.article"].browse(article_ids)
            article_ids.write(values)

    def _prepare_values(self):
        """
        The method to prepare values based on wizard fields

        Returns:
         * dict of values

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        values = {}
        if self.section_id:
            values.update({"section_id": self.section_id.id})
        updated_tags = []
        if self.to_add_tag_ids:
            for tag in self.to_add_tag_ids:
                updated_tags.append((4, tag.id))
        if self.to_remove_tag_ids:
            for tag in self.to_remove_tag_ids:
                updated_tags.append((3, tag.id))
        if updated_tags:
            values.update({"tag_ids": updated_tags})
        if self.activate:
            if self.activate == "activate":
                values.update({"active": True})
            else:
                values.update({"active": False})
        return values
