# -*- coding: utf-8 -*-

from odoo import _, api, fields, models


class knowsystem_article_revision(models.Model):
    """
    The model to keep previous versions of the article and change data
    """
    _name = "knowsystem.article.revision"
    _description = "Article Revision"

    def _compute_name_change(self):
        """
        Compute method for name_change, description_change, tags_change, section_change, attachments_change

        Methods:
         * _return_previous_revision_domain
        """
        for revision in self:
            name_change = description_change = tags_change = section_change = attachments_change = False
            domain = revision._return_previous_revision_domain()
            previous_revision = self.search(domain, order="change_datetime DESC", limit=1)
            if previous_revision:
                if previous_revision.name != revision.name:
                    name_change = True
                if previous_revision.description != revision.description:
                    description_change = len(revision.description or "") - len(previous_revision.description or "")
                if previous_revision.tag_ids != revision.tag_ids:
                    tags_change = True
                if previous_revision.section_id != revision.section_id:
                    section_change = True
                if previous_revision.attachment_ids != revision.attachment_ids:
                    attachments_change = True
            revision.name_change = name_change
            revision.description_change = description_change
            revision.tags_change = tags_change
            revision.section_change = section_change
            revision.attachments_change = attachments_change

    article_id = fields.Many2one(
        "knowsystem.article",
        string="Article",
        ondelete="cascade",
    )
    name = fields.Char(
        string="Previous Title",
        required=True,
        translate=False,
    )
    description = fields.Html(
        string="Previous Article",
        translate=False,
        sanitize=False,
    )
    description_arch = fields.Html(
        string='Body', 
        translate=False,
        sanitize=False,
    )  
    section_id = fields.Many2one(
        "knowsystem.section",
        string="Previous Section",
    )
    tag_ids = fields.Many2many(
        "knowsystem.tag",
        "knowsystem_tag_know_system_article_revision_rel_table",
        "knowsystem_tag_id",
        "knowsystem_atricle_revision_id",
        string="Previous Tags",
    )
    author_id = fields.Many2one(
        "res.users",
        string="Revision author",
        default=lambda self: self.env.user,
    )
    change_datetime = fields.Datetime(
        string="Revision date",
        default=lambda self: fields.Datetime.now(),
    )
    attachment_ids = fields.Many2many(
        'ir.attachment',
        'knowsystem_article_revision_ir_attachment_rel',
        'knowsystem_article_revision_id',
        'attachment_id',
        string='Previous Attachments',
    )
    name_change = fields.Boolean(
        string="Name",
        compute=_compute_name_change,
    )
    description_change = fields.Integer(
        string="Description",
        compute=_compute_name_change,
    )
    tags_change = fields.Boolean(
        string="Tags",
        compute=_compute_name_change,
    )
    section_change = fields.Boolean(
        string="Section",
        compute=_compute_name_change,
    )
    attachments_change = fields.Boolean(
        string="Attachments",
        compute=_compute_name_change,
    )

    _order = "change_datetime DESC, id"

    def name_get(self):
        """
        Overloading the method, to show revision author
        """
        result = []
        for revision in self:
            name = _(u"Revision of the article {} by {} on {}".format(
                revision.name,
                revision.author_id.name,
                revision.change_datetime,
            ))
            result.append((revision.id, name))
        return result

    def _prepare_revision_dict(self):
        """
        The method to prepare revision dict
        """
        self.ensure_one()
        revision = self
        remains = False
        return {
            "id": revision.id,
            "author_id": revision.author_id.name,
            "change_datetime": revision.change_datetime,
            "name": revision.name_change and revision.name or remains,
            "tag_ids": revision.tags_change and ", ".join([tag.name for tag in revision.tag_ids]) or remains,
            "section_id": revision.section_change and revision.section_id.name or remains,
            "description": revision.description_change or remains,
            "attachment_ids": revision.attachments_change
                              and ", ".join([attach.name for attach in revision.attachment_ids])
                              or remains,
        }

    def _return_previous_revision_domain(self):
        """
        The method to return the domain to find the previous revision
        Needed for inheritance purposes

        Extra info:
         * Expected singleton
        """
        revision = self
        return [
            ("change_datetime", "<=", revision.change_datetime),
             ("id", "!=", revision.id),
             ("article_id", "=", revision.article_id.id),
         ]

    def action_recover_this_revision(self):
        """
        The method to return the linked article to this revision state

        Methods:
         * action_back_to_article

        Returns:
         * action

        Extra info:
         * Expected singleton
        """
        self.article_id.write({
            "name": self.name,
            "description_arch": self.description_arch,
            "description": self.description,
            "section_id": self.section_id.id,
            "tag_ids": [(6, 0, self.tag_ids.ids)],
            "attachment_ids": [(6, 0, self.attachment_ids.ids)],
        })
        return self.action_back_to_article()

    def action_back_to_article(self):
        """
        The action to return back to article from revision
        """
        action_id = self.sudo().env.ref("knowsystem.knowsystem_article_action_form_only")
        action = action_id.read()[0]
        action["res_id"] = self.article_id.id
        return action

    def open_revision(self):
        """
        The method to return action of opening revision form
        """
        action_id = self.sudo().env.ref("knowsystem.knowsystem_article_revision_action")
        action = action_id.read()[0]
        action["res_id"] = self.id
        return action
