# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.tools.safe_eval import safe_eval


PARAMS = [
    ("knowsystem_tours_option", safe_eval, "False"),
    ("knowsystem_models_option", safe_eval, "False"),
    ("knowsystem_composer_option", safe_eval, "False"),
    ("knowsystem_systray_option", safe_eval, "False"),
    ("knowsystem_website_editor", safe_eval, "False"),
    ("knowsystem_turnoff_backend_editor", safe_eval, "False"),
    ("knowsystem_no_titles_printed", safe_eval, "False"),
]


class res_config_settings(models.TransientModel):
    _inherit = "res.config.settings"

    @api.onchange("module_knowsystem_website")
    def _onchange_module_knowsystem_website(self):
        """
        Ohchange method for module_knowsystem_website
        """
        for conf in self:
            if not conf.module_knowsystem_website:
                conf.knowsystem_website_editor = False
                conf.module_knowsystem_website_custom_fields = False

    @api.onchange("module_knowsystem_custom_fields")
    def _onchange_module_knowsystem_custom_fields(self):
        """
        Onchange method for module_knowsystem_custom_fields
        """
        for conf in self:
            if not conf.module_knowsystem_custom_fields:
                conf.module_knowsystem_website_custom_fields = False

    @api.onchange("knowsystem_website_editor")
    def _onchange_knowsystem_website_editor(self):
        """
        Onchange method for knowsystem_website_editor
        """
        for conf in self:
            if conf.knowsystem_website_editor:
                ICPSudo = self.env['ir.config_parameter'].sudo()
                website_editor = safe_eval(ICPSudo.get_param('knowsystem_website_editor', default='False'))
                if not website_editor:
                    return {"warning":{
                                "title": _("Warning"),
                                "message": _("Take into account that complex HTML structure created by website builder "
                                             "in the most cases would not be correctly parsed in printing pdf versions "
                                             "and while updating body in email composers"),}
                            }
            else:
                conf.knowsystem_turnoff_backend_editor = False

    knowsystem_tours_option = fields.Boolean(string="Tours")
    knowsystem_models_option = fields.Boolean(string="Articles by Documents")
    knowsystem_composer_option = fields.Boolean(string="Articles in Email Composers")
    knowsystem_systray_option = fields.Boolean(string="KnowSystem in systray")
    module_knowsystem_multilang = fields.Boolean(string="Multiple Languages")
    module_knowsystem_website = fields.Boolean(string="Publish to portal and website")
    module_documentation_builder = fields.Boolean(string="Documentation Builder")
    module_knowsystem_custom_fields = fields.Boolean(string="Custom fields for articles")
    module_knowsystem_website_custom_fields = fields.Boolean(string="Show custom fields in portal and website")
    knowsystem_website_editor = fields.Boolean(string="Edit on website")
    knowsystem_turnoff_backend_editor = fields.Boolean(string="Turn off Backend Editor")
    knowsystem_no_titles_printed = fields.Boolean(string="Print without titles")


    @api.model
    def get_values(self):
        """
        Overwrite to add new system params
        """
        Config = self.env['ir.config_parameter'].sudo()
        res = super(res_config_settings, self).get_values()
        values = {}
        for field_name, getter, default in PARAMS:
            values[field_name] = getter(str(Config.get_param(field_name, default)))
        res.update(**values)
        return res

    def set_values(self):
        """
        Overwrite to add new system params
        """
        Config = self.env['ir.config_parameter'].sudo()
        super(res_config_settings, self).set_values()
        for field_name, getter, default in PARAMS:
            value = getattr(self, field_name, default)
            Config.set_param(field_name, value)
