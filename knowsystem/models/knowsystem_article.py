# -*- coding: utf-8 -*-

import base64
import logging


from odoo import _, api, fields, models, tools
from odoo.exceptions import UserError
from odoo.tools import mail
from odoo.tools.safe_eval import safe_eval

_logger = logging.getLogger(__name__)

REVISIONCHANGES = {"name", "description", "section_id", "tag_ids", "attachment_ids"}
SHORTSYMBOLS = 800


class knowsystem_article(models.Model):
    """
    The core model of the tool - to manage knowledge base contents
    """
    _name = "knowsystem.article"
    _inherit = ["mail.activity.mixin", "mail.thread"]
    _description = "Article"

    @api.depends("revision_ids")
    def _compute_contributor_ids(self):
        """
        Compute method for contributor_ids
        """
        for article in self:
            if article.revision_ids:
                revision_ids = article.revision_ids
                article.write_revision_date = revision_ids[0].change_datetime
                article.write_revision_uid = revision_ids[0].author_id
                contributors = revision_ids.mapped("author_id.id")
                article.contributor_ids = [(6, 0, contributors)]

    def _compute_internal_url(self):
        """
        Compute method for internal_url
        """
        for article in self:
            base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
            action_id = self.sudo().env.ref("knowsystem.knowsystem_article_action").id
            menu_id = self.sudo().env.ref("knowsystem.menu_knowsystem_articles").id
            url = "{base}/web#id={id}&action={action}&model=knowsystem.article&view_type=form&menu_id={menu}".format(
                base=base_url,
                id=article.id,
                action=action_id,
                menu=menu_id,
            )
            article.internal_url = url

    @api.depends("like_user_ids")
    def _compute_likes_number(self):
        """
        Compute method for likes_number
        """
        for article in self:
            article.likes_number = len(article.like_user_ids)

    @api.depends("dislike_user_ids")
    def _compute_dislikes_number(self):
        """
        Compute method for dislikes_number
        """
        for article in self:
            article.dislikes_number = len(article.dislike_user_ids)

    @api.depends("like_user_ids", "dislike_user_ids")
    def _compute_this_user_like_state(self):
        """
        Compute method for this_user_like_state
        """
        current_user = self.env.user.id
        for article in self:
            this_user_like_state = False
            if current_user in article.sudo().like_user_ids.ids:
                this_user_like_state = 'like'
            elif current_user in article.sudo().dislike_user_ids.ids:
                this_user_like_state = 'dislike'
            article.this_user_like_state = this_user_like_state

    @api.depends("like_user_ids", "dislike_user_ids")
    def _compute_likes_score(self):
        """
        Compute method for likes_score
        """
        for article in self:
            article.likes_score = article.likes_number - article.dislikes_number

    @api.depends("user_group_ids", "user_group_ids.users")
    def _compute_access_user_ids(self):
        """
        Compute method for access_user_ids
        """
        for article in self:
            users = article.user_group_ids.mapped("users")
            article.access_user_ids = [(6, 0, users.ids)]

    def _inverse_name(self):
        """
        The inverse method for name and published_name
        The idea is to have proper criteria for searching and sorting articles in portal / website
        """
        for article in self:
            article.search_name_key = article.published_name or article.name 

    def _inverse_description(self):
        """
        The inverse method for description to prepared indexed contents

        Methods:
         * html2plaintext
        """
        for article in self:
            indexed_description = mail.html2plaintext(article.description)
            indexed_description = "\n".join([s for s in indexed_description.splitlines() if s])
            article.indexed_description = indexed_description
            if not article.kanban_manual_description:
                article.kanban_description = len(indexed_description) >= SHORTSYMBOLS \
                                             and indexed_description[0:SHORTSYMBOLS] \
                                             or indexed_description

    def _inverse_attachment_ids(self):
        """
        Inverse method for attachment_ids to make them available for public and portal

        Methods:
         * generate_access_token - of ir.attachment
        """
        for article in self:
            no_token_attachments = article.attachment_ids
            no_token_attachments.write({"res_id": article.id})
            no_token_attachments.generate_access_token()

    def _inverse_kanban_manual_description(self):
        """
        Inverse method for kanban_manual_description
        """
        for article in self:
            kanban_manual_description = article.kanban_manual_description
            if kanban_manual_description:
                article.kanban_description = kanban_manual_description

    @api.model
    def _generate_order_by(self, order_spec, query):
        """
        Specify how to proceed the technical search by name - to lower case it
        """
        res = super(knowsystem_article, self)._generate_order_by(order_spec=order_spec, query=query)
        if "name asc" or "name desc" in order_spec:
            res = res.replace('"knowsystem_article__name"."value"', 'LOWER("knowsystem_article__name"."value")')
            res = res.replace('"knowsystem_article"."name"', 'LOWER("knowsystem_article"."name")')
        if "search_name_key asc" or "search_name_key desc" in order_spec:
            res = res.replace('"knowsystem_article"."search_name_key"', 'LOWER("knowsystem_article"."search_name_key")')
        return res

    name = fields.Char(
        string="Article Title",
        required=True,
        translate=False,
        inverse=_inverse_name,
    )
    published_name = fields.Char(
        string="Published Title",
        translate=False,
        help="If defined, this title would be used for portal articles, documentation builder, and for PDFs",
        inverse=_inverse_name,
    )
    search_name_key = fields.Char(
        string="Search in title",
        translate=False,
    )
    description = fields.Html(
        string="Article",
        translate=False,
        sanitize=False,
        inverse=_inverse_description,
    )
    description_arch = fields.Html(
        string="Body", 
        translate=False,
        sanitize=False,
    )
    indexed_description = fields.Text(
        string="Indexed Article",
        translate=False,
    )
    kanban_description = fields.Text(
        string="Summary",
        translate=False,
    )
    kanban_manual_description = fields.Html(
        string="Preview Summary",
        inverse=_inverse_kanban_manual_description,
        translate=False,
        sanitize=False,
    )
    section_id = fields.Many2one(
        "knowsystem.section",
        string="Section",
        ondelete='restrict',
    )
    tag_ids = fields.Many2many(
        "knowsystem.tag",
        "knowsystem_tag_know_system_article_r_table",
        "knowsystem_tag_r_id",
        "knowsystem_atricle_r_id",
        string="Tags",
        copy=True,
    )
    revision_ids = fields.One2many(
        "knowsystem.article.revision",
        "article_id",
        string="Revisions",
    )
    write_revision_date = fields.Datetime(
        string="Last revision on",
        compute=_compute_contributor_ids,
        store=True,
    )
    write_revision_uid = fields.Many2one(
        "res.users",
        string="Last revision by",
        compute=_compute_contributor_ids,
        store=True,
    )
    attachment_ids = fields.Many2many(
        'ir.attachment',
        'knowsystem_article_ir_attachment_rel',
        'knowsystem_article_id',
        'attachment_id',
        string='Attachments',
        copy=True,
        inverse=_inverse_attachment_ids,
    )
    active = fields.Boolean(
        string="Active",
        default=True,
        help="Uncheck to archive this tag",
        copy=False,
    )
    contributor_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_article_rel_contributor_table",
        "res_users_contributor_id",
        "knowsystem_article_contributor_id",
        string="Contributors",
        compute=_compute_contributor_ids,
        store=True,
        help="Users which have created or updated the article",
    )
    internal_url = fields.Char(
        string="Internal link",
        compute=_compute_internal_url,
        store=False,
        copy=False,
    )
    views_number_internal = fields.Integer(
        string="Views",
        help="""How many time the article has been opened""",
        copy=False,
        default=0,
    )
    view_stat_ids = fields.Many2many(
        "know.view.stat",
        "know_view_stat_knowsystem_article_rel_table",
        "know_view_stat_id",
        "knowsystem_article_id",
        string="View Stats",
    )
    used_in_email_compose = fields.Integer(
        string="Referred in emails",
        help="""How many times this article is used to prepare emails""",
        copy=False,
        default=0,
    )
    favourite_user_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_article_rel_favor_table",
        "res_users_favor_id",
        "knowsystem_article_favor_id",
        string="Favourite of",
        copy=False,
    )
    like_user_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_article_rel_likes_table",
        "res_users_like_id",
        "knowsystem_article_like_id",
        string="Likes by",
        copy=False,
    )
    likes_number = fields.Integer(
        string="Likes Number",
        compute=_compute_likes_number,
        compute_sudo=True,
        store=True,
        default=0,
    )
    dislike_user_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_article_rel_dislikes_table",
        "res_users_dislike_id",
        "knowsystem_article_dislike_id",
        string="Dislikes by",
        copy=False,
    )
    dislikes_number = fields.Integer(
        string="Dislikes Number",
        compute=_compute_dislikes_number,
        compute_sudo=True,
        store=True,
        default=0,
    )
    this_user_like_state = fields.Selection(
        [
            ("like", "Liked"),
            ("dislike", "Disliked"),
        ],
        string="Users Like State",
        compute=_compute_this_user_like_state,
    )
    likes_score = fields.Integer(
        string="Likes Score",
        compute=_compute_likes_score,
        compute_sudo=True,
        store=True,
    )
    user_group_ids = fields.Many2many(
        "res.groups",
        "res_groups_knowsystem_article_rel_table",
        "res_groups_id",
        "knowsystem_article_id",
        string="Restrict access to",
        help="""
            If selected, a user should belong to one of those groups to access this article
            The exceptions are (1) KnowSystem administrators; (2) Authors of the articles
            To access the article a user should also have an access to the section
        """,
    )
    access_user_ids = fields.Many2many(
        "res.users",
        "res_users_knowsystem_article_rel_table",
        "res_users_id",
        "knowsystem_article_id",
        string="Access Users",
        compute=_compute_access_user_ids,
        compute_sudo=True,
        store=True,
    )
    color = fields.Integer(string='Color')

    _order = "views_number_internal DESC, id"

    @api.model
    def create(self, values):
        """
        Re-write to:
         * Save this article version in revisions

        Methods:
         * _prepare_revisions
        """
        res = super(knowsystem_article, self).create(values)   
        res._prepare_revisions()
        return res

    def write(self, values):
        """
        Re-write to:
         * Save this article version in revisions and notify of those
        1. we need this, since description is always shown as val to write

        Methods:
         * _prepare_revisions
         * _notify_of_revisions
        """
        changed_fields = set(values.keys())
        need_revision = REVISIONCHANGES & changed_fields
        if need_revision and "description" in need_revision:
            # 1
            for article in self:
                if values.get("description") != article.description:
                    break
            else:
                need_revision.remove("description")
        res = super(knowsystem_article, self).write(values)
        if need_revision:
            # 2
            self._prepare_revisions()
            self._notify_of_revisions()
        return res

    def action_get_published_name(self):
        """
        The method to define what would be used for pubslished article title
        Used for printing version, website/portal views, documentation builder
        
        Extra info:
         * Expected singleton

        Returns:
         * string
        """
        cur_lang = self._context.get("lang") or self.env.user.lang or "en_US"
        self = self.with_context(lang=cur_lang)
        return self.published_name and self.published_name or self.name

    def _prepare_revisions(self):
        """
        The method to save this version of the article before its revisions are saved

        Methods:
         * _prepare_revision_dict
        """
        for article in self:
            values = article._prepare_revision_dict()
            revision_id = self.env["knowsystem.article.revision"].create(values)

    def _notify_of_revisions(self):
        """
        The method to send notifications by detected revisions

        Methods:
         * _render_template_qweb of mail.template (mail.render.mixin)
         * message_post of mail.thread
        """
        for article in self:
            template = self.env.ref("knowsystem.revisions_change_notification")
            body_html = template._render_template_qweb(
                template.body_html,
                "knowsystem.article",
                [article.id],
            ).get(article.id)
            subject = template.subject
            article.message_post(
                body=body_html,
                subject=subject,
                subtype_xmlid="knowsystem.mt_knowsystem_revisions",
            )

    def _prepare_revision_dict(self):
        """
        The method to prepare this article revision dict
        """
        article = self
        return {
            "article_id": article.id,
            "name": article.name,
            "description": article.description,
            "description_arch": article.description_arch,
            "section_id": article.section_id.id,
            "tag_ids": [(6, 0, article.tag_ids.ids)],
            "attachment_ids": [(6, 0, article.attachment_ids.ids)],
        }

    def return_complementary_data(self):
        """
        The method to return dict of complementary data:
         * likes_counter
         * dislikes_counter
         * user_like
         * user_dislike

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        self = self.with_context(lang=self.env.user.lang)
        ICPSudo = self.env['ir.config_parameter'].sudo()
        website_editor = safe_eval(ICPSudo.get_param('knowsystem_website_editor', default='False'))
        learning_tour = safe_eval(ICPSudo.get_param('knowsystem_tours_option', default='False'))
        return {
            "likes_counter": self.likes_number,
            "dislikes_counter": self.dislikes_number,
            "user_like": self.this_user_like_state == "like" and True or False,
            "user_dislike": self.this_user_like_state == "dislike" and True or False,
            "favourite": self.env.user.id in self.favourite_user_ids.ids and True or False,
            "active": self.active,
            "follow": self.message_is_follower,
            "knowsystem_website": False,
            "website_published": False,
            "website_editor": website_editor,
            "learning_tour": learning_tour,
        }

    def rerurn_all_pages_ids(self, domain):
        """
        The method to search articles by js domain

        Returns:
         *  list of all selected articles
        """
        all_articles = set(self.ids + self.search(domain).ids)
        return list(all_articles)

    def update_number_of_views(self):
        """
        Increment number of views_number_internal

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        user_id = self._uid
        self = self.sudo()
        self.views_number_internal = self.views_number_internal + 1
        existing_stat_id = self.view_stat_ids.filtered(lambda stat: stat.user_id.id == user_id)
        if existing_stat_id:
            existing_stat_id.counter = existing_stat_id.counter + 1
        else:
            self.view_stat_ids = [(0, 0, {"user_id": user_id, "counter": 1})]

    def update_number_of_used_in_email_compose(self):
        """
        Increment number of used_in_email_compose
        """
        for article in self:
            article.sudo().used_in_email_compose = article.sudo().used_in_email_compose + 1

    def select_template(self):
        """
        The method to find and return create template wizard
        """
        action_id = self.sudo().env.ref("knowsystem.create_from_template_action")
        action = action_id.read()[0]
        return action

    def get_revisions(self):
        """
        The method to return js dictionary of revisions

        Methods:
         * _prepare_revision_dict of knowsystem.article.revision

        Return:
         * the list of dict
        """
        js_dict = []
        for revision in self.revision_ids:
            revision_vals = revision._prepare_revision_dict()
            if revision_vals:
                js_dict.append(revision_vals)
        return js_dict

    def save_as_pdf(self):
        """
        The method to generate pdf of the article

        Returns:
         * action of the report
        """
        return self.env.ref('knowsystem.action_report_knowsystem_article').report_action(self)

    def print_articles_batch(self, section, tag):
        """
        The method to generate pdf of the article

        Args:
         * section - id of knowsystem.section
         * tag - id of knowsystem.tag

        Returns:
         * action of the report
        """
        domain = []
        if section:
            domain.append(("section_id", "child_of", section))
        if tag:
            domain.append(("tag_ids", "child_of", tag))
        articles = self.search(domain)
        if not articles:
            raise UserError(_("There are no articles to print"))
        return self.env.ref('knowsystem.action_report_knowsystem_article').report_action(articles)

    def get_info_formview_id(self, access_uid=None):
        """
        The method to get form view with informational field
        """
        view_id = self.sudo().env.ref('knowsystem.knowsystem_article_view_form_info').id
        return view_id

    def get_rights_formview_id(self, access_uid=None):
        """
        The method to get form view with user groups
        """
        view_id = self.sudo().env.ref('knowsystem.knowsystem_article_view_form_rights').id
        return view_id

    def mark_as_favourite(self):
        """
        The action to add the article to favourites
        """
        self.ensure_one()
        current_user = self.env.user.id
        if current_user in self.favourite_user_ids.ids:
            self.sudo().favourite_user_ids = [(3, current_user)]
        else:
            self.sudo().favourite_user_ids = [(4, current_user)]
        cdata = self.return_complementary_data()
        return cdata

    def like_the_article(self):
        """
        The action to 'like' the article
        """
        self.ensure_one()
        current_user = self.env.user.id
        if not self.this_user_like_state == "like":
            if self.this_user_like_state == "dislike":
                self.sudo().dislike_user_ids = [(3, current_user)]
            self.sudo().like_user_ids = [(4, current_user)]
        else:
            self.sudo().like_user_ids = [(3, current_user)]
        cdata = self.return_complementary_data()
        return cdata

    def dislike_the_article(self, dislike=False):
        """
        The action to 'dislike' the article
        """
        self.ensure_one()
        current_user = self.env.user.id
        if not self.this_user_like_state == "dislike":
            if self.this_user_like_state == "like":
                self.sudo().like_user_ids = [(3, current_user)]
            self.sudo().dislike_user_ids = [(4, current_user)]
        else:
            self.sudo().dislike_user_ids = [(3, current_user)]
        cdata = self.return_complementary_data()
        return cdata

    def archive_article(self):
        """
        The method to archive / restore the article
        """
        self.ensure_one()
        self.toggle_active()
        cdata = self.return_complementary_data()
        return cdata

    def publish_article(self):
        """
        The dymmy method to be implemented in knowsystem_website
        """
        pass

    def edit_website(self):
        """
        The dymmy method to be implemented in knowsystem_website
        """
        pass

    def return_selected_articles(self):
        """
        The method to return selected articles

        Returns:
         * list of 2 elements
          ** list of dict of articles values requried for mass operations
          ** whether website is installed
        """
        self = self.with_context(lang=self.env.user.lang)
        articles = []
        for article in self:
            articles.append({
                "id": article.id,
                "name": article.name,
            })
        return [articles, False]

    def return_mass_update_wizard(self):
        """
        The method to return mass update wizard view
        """
        view_id = self.sudo().env.ref('knowsystem.article_update_form_view').id
        return view_id

    def return_add_to_tour_wizard(self):
        """
        The method to return add to tourd view
        """
        view_id = self.sudo().env.ref('knowsystem.add_to_tour_form_view').id
        return view_id

    def action_make_template(self):
        """
        The method to open the wizard for creating a template based on this article

        Returns:
         * action

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        action_id = self.sudo().env.ref("knowsystem.knowsystem_article_template_action_only_form")
        action = action_id.read()[0]
        action["context"] = {"default_knowdescription": self.with_context(lang=self.env.user.lang).description_arch}
        return action

    def mass_add_to_favourites(self):
        """
        The method to add a few articles to favourites simultaneously
        """
        user = self.env.user.id
        self.sudo().write({"favourite_user_ids": [(4, user)]})

    def mass_archive(self):
        """
        The method to archive a few articles simultaneously
        """
        self.write({"active": False})

    def mass_publish(self):
        """
        Dummy method to be implemented in knowsystem website
        """
        pass

    def mass_copy(self):
        """
        The method to add a few articles to favourites simultaneously
        """
        for atricle in self:
            atricle.copy()

    def mass_follow_articles(self):
        """
        The method to follow the articles
        """
        partner_id = self.env.user.partner_id.ids
        self.message_subscribe(partner_ids=partner_id)

    def mass_unfollow_articles(self):
        """
        The method to unfollow the articles
        """
        partner_id = self.env.user.partner_id.ids
        self.message_unsubscribe(partner_ids=partner_id)

    def return_article_by_id(self):
        """
        Method used in js to return article body and name

        Args:
         * dict, main key is hint_id - id of related ticket hint (string!)

        Returns:
         * list of 2
          ** dict (of article):
           *** id
          ** list of dicts (actions)
           *** id
           *** name

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        article = {"id": self.id,}
        actions = [
            {"id": "share_url", "name": _("Share link")},
            {"id": "add_to_body", "name": _("Update body")},
            {"id": "add_pdf", "name": _("Attach")},
        ]
        return [article, actions]

    def proceed_article_action(self, action):
        """
        Method to proceed email composer action

        Args:
         * action - char

        Methods:
         * _render_qweb_pdf of ir.actions.reports
         * update_number_of_used_in_email_compose

        Returns:
         * dict to proceed actions (with description, url, etc.)
        """
        if len(self) == 0:
            raise UserError(_("You have not selected any article"))
        res = False
        self = self.with_context(lang=self.env.user.lang)
        if action == "add_to_body":
            description = ""
            for article in self:
                if article.description:
                    description += article.description
            res = {"descr": description,}
        if action == "share_url":
            link = ""
            for article in self:
                if hasattr(article, "website_url"):
                    url = article.website_url
                else:
                    url = article.internal_url
                link += u"<p><a href='{}'>{}</a></p>".format(url, article.name)
            res = {"url": link,}
        elif action == "add_pdf":
            report = self.sudo().env.ref("knowsystem.action_report_knowsystem_article")
            attachment_ids = []
            for article in self:
                result, report_format = report._render_qweb_pdf(article.ids)
                result = base64.b64encode(result)
                report_name = "{}.{}".format(article.name, report_format)
                attach_values = {
                    "name": report_name,
                    "datas": result,
                    "res_model": "mail.compose.message",
                    "res_id": 0,
                    "type": "binary",
                }
                new_attachment_id = self.env["ir.attachment"].create(attach_values)
                attachment_ids.append(new_attachment_id.read()[0])
            res = {"attachment_ids": attachment_ids}
        self.update_number_of_used_in_email_compose()
        return res

    @api.model
    def action_return_types(self, website_published=False, website_id=False):
        """
        The method to return article types if they exist (to be overwritten in knowsystem custom fields)
        """
        return []

    def return_type_edit_form(self):
        """
        The method to open custom type form: dummy since the model would appear only in knowsystem_custom_fields app
        """
        return False

    @api.model
    def get_backend_editor_widget(self):
        """
        The method to retieve wether website editor is turned off

        Returns:
         * False - if turned On
         * True - if turned off
        """
        ICPSudo = self.env['ir.config_parameter'].sudo()
        backend_editor_off = safe_eval(ICPSudo.get_param('knowsystem_turnoff_backend_editor', default='False'))
        return backend_editor_off

    @api.model
    def should_title_be_printed(self):
        """
        The method to define whether article titles should be included into the report

        Returns:
         * bool
        """
        ICPSudo = self.env["ir.config_parameter"].sudo()
        knowsystem_no_titles_printed = safe_eval(ICPSudo.get_param("knowsystem_no_titles_printed", default="False"))
        return knowsystem_no_titles_printed        
