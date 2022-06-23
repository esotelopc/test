# -*- coding: utf-8 -*-

from odoo import fields, models


class know_view_stat(models.Model):
    """
    The model to systemize article tags
    """
    _name = "know.view.stat"
    _description = "View Stats"
    _rec_name = "user_id"

    user_id = fields.Many2one(
    	"res.users", 
    	"User",
    )
    counter = fields.Integer(string="Number")

    def name_get(self):
        """
        Overloading the method to construct name as user + number
        """
        result = []
        for stat in self:
            name = u"{} ({})".format(
                stat.user_id.name,
                stat.counter,
            )
            result.append((stat.id, name))
        return result    
