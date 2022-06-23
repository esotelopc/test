# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.tools.safe_eval import safe_eval

MAXSECTIONSIZE = 150
MAXARTICLESIZE = 125

class knowsystem_section(models.Model):
    """
    The model to structure articles in sections and subsections
    """
    _name = "knowsystem.section"
    _inherit = ["knowsystem.node"]
    _description = "Section"

    def _compute_has_right_to(self):
        """
        Compute method for has_right_to

        Methods:
         * _check_rights_recursively
        """
        current_user = self.env.user
        groups = current_user.groups_id
        self = self.sudo()
        sections = self.search([("parent_id", "=", False)])
        available_sections = []
        for section in sections:
            available_sections += section._check_rights_recursively(groups)
        for section in self:
            section.has_right_to = section.id in available_sections and [(6, 0, [current_user.id])] or False

    def search_has_right_to(self, operator, value):
        """
        Search method for has_right_to

        Methods:
         * _check_rights_recursively
        """
        current_user = self.env["res.users"].browse(value)
        self.env["res.users"].invalidate_cache(ids=[current_user.id])
        groups = current_user.groups_id
        self = self.sudo()
        sections = self.search([
            ("parent_id", "=", False),
            "|",
                ("active", "=", True),  
                ("active", "=", False),
        ])
        res = []
        for section in sections:
            res += section._check_rights_recursively(groups)
        return [('id', 'in', res)]

    name = fields.Char(
        string="Section Title",
        required=True,
        translate=False,
    )
    description = fields.Html(
        string="Section Description",
        translate=False,
    )
    parent_id = fields.Many2one(
        "knowsystem.section",
        string="Parent Section",
    )
    child_ids = fields.One2many(
        "knowsystem.section",
        "parent_id",
        string="Sub Sections"
    )
    article_ids = fields.One2many(
        "knowsystem.article",
        "section_id",
        string="Articles",
    )
    user_group_ids = fields.Many2many(
        "res.groups",
        "res_groups_knowsystem_section_rel_table",
        "res_groups_id",
        "knowsystem_section_id",
        string="Restrict access to",
        help="""
            If selected, a user should belong to one of those groups to access this section and ALL ITS ARTICLES
            Besides, a user should have rights to the parent sections hierarchically
            The exceptions are (1) KnowSystem administrators; (2) Authors of the articles
        """,
    )
    has_right_to = fields.Many2many(
        "res.users",
        "res_user_knowsystem_section_rel_table_access",
        "res_user_id",
        "knowsystem_section_id",
        string="Current user has right to this section",
        compute=_compute_has_right_to,
        search='search_has_right_to',
    )

    _order = "sequence, id"

    def return_edit_form(self):
        """
        The method to return tag editing form
        """
        view_id = self.sudo().env.ref('knowsystem.knowsystem_section_view_form').id
        return view_id

    def _check_rights_recursively(self, groups):
        """
        The method to check rights for this section and go to childs for the next check

        Principles:
         * a user should belong at least to a single group to have rights for this section
         * if the section doesn't have groups --> it is global, everybody has rights for it
         * if a user doesn't have an access to this section --> this user doesn't have rights for all its children

        Args:
         * groups - res.group recordset

        Returns:
         * list of ints - section ids

        Extra info:
         * Expected Singleton
        """
        self.ensure_one()
        res = []
        if not self.user_group_ids or (groups & self.user_group_ids):
            res.append(self.id)
            for child in self.child_ids:
                res += child._check_rights_recursively(groups=groups)
        return res

    @api.model
    def action_check_option(self, ttype):
        """
        The method to check whether a quick link should be placed

        Args:
         * ttype - 'composer', 'form'

        Returns:
         * bool
        """
        Config = self.env['ir.config_parameter'].sudo()
        need = False
        if ttype == "composer":
            need = safe_eval(Config.get_param("knowsystem_composer_option", "False"))
        elif ttype == "form":
            need = safe_eval(Config.get_param("knowsystem_models_option", "False"))
        return need
