# -*- coding: utf-8 -*-

from odoo import api, fields, models


class article_search(models.TransientModel):
    _name = "article.search"
    _description = "Search Articles"
    
    @api.onchange("section_ids", "tag_ids", "search", "selected_article_ids")
    def _onchange_section_ids(self):
        """
        Onchange method for section_ids

        Extra info:
         * Expected singleton
        """
        domain = []
        if self.selected_article_ids:
            domain += [("id", "not in", self.selected_article_ids.ids)]
        if self.section_ids:
            domain += [("section_id", "child_of", self.section_ids.ids)]
        if self.tag_ids:
            domain += [("tag_ids", "child_of", self.tag_ids.ids)]
        if self.search:
            domain += ['|', ('name', 'ilike', self.search), ('indexed_description', 'ilike', self.search)]
        if str(domain) != self.prev_domain:
            articles = self.env["knowsystem.article"].search(domain)
            self.prev_domain = domain
            self.article_ids = articles

    section_ids = fields.Many2many(
        "knowsystem.section",
        "knowsystem_section_article_search_rel_table",
        "knowsystem_section_id",
        "article_search_id",
        string="Sections",
    )
    tag_ids = fields.Many2many(
        "knowsystem.tag",
        "knowsystem_tag_article_search_rel_table",
        "knowsystem_tag_id",
        "article_search_id",
        string="Tags",
    )
    search = fields.Char(string="Search in contents",)
    article_ids = fields.Many2many(
        "knowsystem.article",
        "knowsystem_article_article_search_rel_table",
        "knowsystem_article_id",
        "article_search_id",
        string="Articles",
    )
    selected_article_ids = fields.Many2many(
        "knowsystem.article",
        "knowsystem_article_article_search_selected_rel_table",
        "knowsystem_selected_article_id",
        "article__selected_search_id",
        string="Selected Articles",
    )
    no_selection = fields.Boolean(
        string="No selection",
        default=False,
    )
    prev_domain = fields.Text(store=False)
