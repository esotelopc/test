# -*- coding: utf-8 -*-

from odoo import models
from odoo.http import request
from odoo.tools.safe_eval import safe_eval


class IrHttp(models.AbstractModel):
    """
    Overwrite to pass to the session whether a quick systray is turned on
    """
    _inherit = 'ir.http'

    def session_info(self):
        result = super(IrHttp, self).session_info()
        ICPSudo = request.env['ir.config_parameter'].sudo()
        show_knowsystem_quick = safe_eval(ICPSudo.get_param('knowsystem_systray_option', default='False'))
        result.update(show_knowsystem_quick=show_knowsystem_quick)
        return result
