# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.tools.safe_eval import safe_eval

class knowsystem_tour(models.Model):
    """
    The model configure tours (sequence) of articles
    """
    _name = "knowsystem.tour"
    _description = "Tour"

    @api.depends("user_ids.user_id", "user_ids.current_article_id")
    def _compute_current_article_title(self):
        """
        Compute method for this_user_progress_id, current_article_title, current_article_description and progress
        """
        user_id = self.env.user
        for tour in self:
            current_article_title = current_article_description = progress = this_user_progress_id = False
            if tour.tour_article_ids:
                user_pros = tour.user_ids.filtered(lambda pro: pro.user_id == user_id)
                if user_pros:
                    this_user_progress_id = user_pros[0]
                    progress = this_user_progress_id.progress
                    current_article_id = this_user_progress_id.current_article_id
                else:
                    progress = 0
                    current_article_id = tour.tour_article_ids[0]
                current_article_title = current_article_id.article_id.name
                current_article_description = current_article_id.article_id.description
            tour.this_user_progress_id = this_user_progress_id
            tour.progress = progress
            tour.current_article_title = current_article_title
            tour.current_article_description = current_article_description

    @api.depends("user_group_ids", "user_group_ids.users")
    def _compute_access_user_ids(self):
        """
        Compute method for access_user_ids
        """
        for tour in self:
            users = tour.user_group_ids.mapped("users")
            tour.access_user_ids = [(6, 0, users.ids)]

    name = fields.Char(
        string="Tour Title",
        required=True,
        translate=False,
    )
    description = fields.Html(
        string="Tour Description",
        translate=False,
    )
    tour_article_ids = fields.One2many(
        "knowsystem.tour.article",
        "tour_id",
        string="Articles",
    )
    sequence = fields.Integer(
        string="Sequence",
        help="""The lesser the closer to the top""",
        default=0,
    )
    active = fields.Boolean(
        string="Active",
        default=True,
        help="Uncheck to archive this tag"
    )
    user_ids = fields.One2many(
        "knowsystem.tour.user",
        "tour_id",
        string="Users progress",
    )
    this_user_progress_id = fields.Many2one(
        "knowsystem.tour.user",
        compute=_compute_current_article_title,
    )
    current_article_title = fields.Char(
        compute=_compute_current_article_title,
        store=False,
        string="Article Title",
    )
    current_article_description = fields.Html(
        compute=_compute_current_article_title,
        store=False,
        string="Article Contents",
        sanitize=False,
    )
    progress = fields.Float(
        string="Progress",
        compute=_compute_current_article_title,
    )
    user_group_ids = fields.Many2many(
        "res.groups",
        "res_groups_knowsystem_tour_rel_table",
        "res_groups_id",
        "knowsystem_tour_id",
        string="Restrict access to",
        help="""If selected, a user should belong to one of those groups to access this tour""",
    )
    access_user_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_tour_rel_table",
        "res_users_id",
        "knowsystem_tour_id",
        string="Access Users",
        compute=_compute_access_user_ids,
        compute_sudo=True,
        store=True,
    )

    _order = "sequence, id"

    def action_start_the_tour(self):
        """
        The method to start the tour from scratch (either for the first time or repeat)

        Returns:
         * the first article in all available for this user

        Extra info:
         * Expected singleton
        """
        current_user_id = self.env.user
        involved_users = self.user_ids.mapped("user_id")
        if self.this_user_progress_id.sudo():
            self.this_user_progress_id.sudo().unlink()
        self.sudo().user_ids = [(0, 0, {
            "tour_id": self.id,
            "user_id": current_user_id.id,
            "current_article_id": self.tour_article_ids and self.tour_article_ids[0].id or False,
        })]
        read_articles = self.tour_article_ids.filtered(lambda art: current_user_id.id in art.done_by_user_ids.ids)
        read_articles.sudo().write({"done_by_user_ids": [(5, current_user_id.id)]})
        return self.action_keep_the_tour()

    def action_keep_the_tour(self):
        """
        The method to start the tour from not yet read articles

        Methods:
         * update_number_of_views

        Returns:
         * action to open the tour article view

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        action_id = self.sudo().env.ref("knowsystem.knowsystem_tour_action_form_article")
        action = action_id.read()[0]
        action["res_id"] = self.id
        related_article = self.this_user_progress_id.current_article_id.article_id
        related_article.update_number_of_views()
        return action

    def action_get_next_article(self):
        """
        The method to return the next article for this user

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        progress_id = self.this_user_progress_id
        current_user = self.env.user.id
        if current_user not in progress_id.current_article_id.done_by_user_ids.ids:
            progress_id.sudo().current_article_id.done_by_user_ids = [(4, current_user)]
        return progress_id._move_to_the_next_article()

    def action_get_previous_article(self):
        """
        The method to return the previous article for this user

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        progress_id = self.this_user_progress_id
        return progress_id._move_to_the_previous_article()

    def return_form_view(self):
        """
        The method to open form of the tour

        Returns:
         * action
        """
        action_id = self.sudo().env.ref("knowsystem.knowsystem_tour_action_form_only")
        action = action_id.read()[0]
        action["res_id"] = self.id
        return action

    def return_popup_form_view(self):
        """
        The method to open form of the tour

        Returns:
         * action
        """
        view_id = self.sudo().env.ref("knowsystem.knowsystem_tour_view_form").id
        return view_id

    def return_start_page(self):
        """
        The method to open form of the tour (start page)

        Returns:
         * action
        """
        action_id = self.sudo().env.ref("knowsystem.knowsystem_tour_action_form_start")
        action = action_id.read()[0]
        action["res_id"] = self.id
        return action

    def return_tours(self):
        """
        The method to find all active tours and return then to js

        Returns:
         * list of dicts (name, id)
        """
        Config = self.env['ir.config_parameter'].sudo()
        need_tours = safe_eval(Config.get_param("knowsystem_tours_option", "False"))
        if need_tours:
            tour_ids = self.search([])
            res = []
            for tour in tour_ids:
                res.append({
                    "name": tour.name,
                    "id": tour.id
                })
        else:
            res = False
        return res
