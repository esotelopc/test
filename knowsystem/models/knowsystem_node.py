# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

EMPTYHTML = [False, "", " ", "<p><br></p>", "<p></p>", "<p> </p>"]

class knowsystem_node(models.AbstractModel):
    """
    This is the Abstract Model to manage jstree nodes
    It is used for sections and tags

    To-do:
     * pass colors to js tree. Have a look at the web ColorpickerDialog
    """
    _name = "knowsystem.node"
    _description = "KnowSystem Node"

    @api.constrains('parent_id')
    def _check_node_recursion(self):
        """
        Constraint for recursion
        """
        if not self._check_recursion():
            raise ValidationError(_('It is not allowed to make recursions!'))
        return True

    def _inverse_active(self):
        """
        Inverse method for active. There 2 goals:
         1. If a parent is not active, we activate it. It recursively activate all its further parents
         2. Deacticate all children. It will invoke deactivation recursively of all children after
        """
        for node in self:
            if node.active:
                # 1
                if node.parent_id and not node.parent_id.active:
                    node.parent_id.active = True
            else:
                # 2
                node.child_ids.write({"active": False})


    active = fields.Boolean(
        string="Active",
        default=True,
        help="Uncheck to archive",
        inverse=_inverse_active,
    )
    sequence = fields.Integer(
        string="Sequence",
        help="""The lesser the closer to the top""",
        default=0,
    )

    def name_get(self):
        """
        Overloading the method, to reflect parent's name recursively
        """
        result = []
        for node in self:
            name = u"{}{}".format(
                node.parent_id and node.parent_id.name_get()[0][1] + '/' or '',
                node.name,
            )
            result.append((node.id, name))
        return result

    def action_website_publish(self):
        """
        The method to publish node
        """
        try:
            self.write({"website_published": True})
        except:
            # to the case when "website_published" is not defined
            pass


    def action_website_unpublish(self):
        """
        The method to publish node
        """
        try:
            self.write({"website_published": False})
        except:
            pass

    @api.model
    def return_nodes(self):
        """
        The method to return nodes in jstree format

        Methods:
         * _return_nodes_recursive

        Returns:
         * list of folders dict with keys:
           ** id
           ** text - folder_name
           ** icon
           ** children - array with the same keys
        """
        self = self.with_context(lang=self.env.context.get("lang") or self.env.user.lang)
        nodes = self.search([("parent_id", "=", False)])
        res = []
        for node in nodes:
            res.append(node._return_nodes_recursive())
        return res

    def return_nodes_with_restriction(self, tooltip=False):
        """
        The method to return nodes in recursion for that actual nodes. Not for all

        Args:
         * tooltip - whether to add help message

        Methods:
         * _return_nodes_recursive

        Returns:
         * list of folders dict with keys:
           ** id
           ** text - folder_name
           ** icon
           ** children - array with the same keys
        """
        self = self.with_context(lang=self.env.context.get("lang") or self.env.user.lang, show_tooltip=tooltip) 
        nodes = self.search([
            ("id", "in", self.ids),
            "|",
                ("parent_id", "=", False),
                ("parent_id", "not in", self.ids),
        ])
        res = []
        for node in nodes:
            res.append(node._return_nodes_recursive(restrict_nodes=self))
        return res

    def _return_nodes_recursive(self, restrict_nodes=False):
        """
        The method to go by all nodes recursively to prepare their list in js_tree format

        Args:
         * nodes - optional param to restrict child with current nodes

        Extra info:
         * sorted needed to fix unclear bug of zero-sequence element placed to the end
         * Expected singleton
        """
        self.ensure_one()
        res = {
            "text": self.name,
            "id": self.id,
        }
        if self._context.get("show_tooltip") and hasattr(self, "description") and self.description not in EMPTYHTML:
            res.update({"a_attr": {"kn_tip": self.description},})
        child_res = []
        child_ids = self.search([("id", "in", self.child_ids.ids)], order="sequence")
        for child in child_ids:
            if restrict_nodes and child not in restrict_nodes:
                continue
            child_res.append(child._return_nodes_recursive())
        res.update({"children": child_res})
        return res

    @api.model
    def create_node(self, data):
        """
        The method to update node name

        Methods:
         * _order_node_after_dnd

        Returns:
         * int - id of newly created record
        """
        name = data.get("text")
        parent_id = data.get("parent")
        if parent_id == "#":
            parent_id = False
        else:
            parent_id = int(parent_id)
        new_node = self.create({
            "name": name,
            "parent_id": parent_id,
        })
        new_node._order_node_after_dnd(parent_id=parent_id, position=False)
        return new_node.id

    def update_node(self, data, position):
        """
        The method to update node name

        Args:
         * data - dict of node params
         * position - false (in case it is rename) or int (in case it is move)

        Methods:
         * _order_node_after_dnd

        Returns:
         * int - id of udpated record

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        new_name = data.get("text")
        new_parent_id = data.get("parent")
        new_parent_id = new_parent_id != "#" and int(new_parent_id) or False
        if self.name != new_name:
            self.name = new_name
        if self.parent_id.id != new_parent_id:
            self.parent_id = new_parent_id
        if position is not False:
            self._order_node_after_dnd(parent_id=new_parent_id, position=position)
        return self.id

    def delete_node(self):
        """
        The method to deactivate a node
        It triggers recursive deactivation of children

        Returns:
         * int - id of udpated record

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        self.active = False
        return True

    def _order_node_after_dnd(self, parent_id, position):
        """
        The method to normalize sequence when position of Node has been changed based on a new element position and
        its neighbours.
         1. In case of create we put element always to the end
         2. We try to update all previous elements sequences in case it become the same of a current one (sequence
            migth be negative)

        Args:
         * parent_id - int - id of node
         * position - int or false (needed to the case of create)

        Extra info:
         * Epected singleton
        """
        self.ensure_one()
        the_same_children_domain = [("id", "!=", self.id)]
        if parent_id:
            the_same_children_domain.append(("parent_id.id", "=", parent_id))
        else:
            the_same_children_domain.append(("parent_id", "=", False))
        this_parent_nodes = self.search(the_same_children_domain)
        if position is False:
            position = len(this_parent_nodes)
        if this_parent_nodes:
            neigbour_after = len(this_parent_nodes) > position and this_parent_nodes[position] or False
            neigbour_before = position > 0 and this_parent_nodes[position-1] or False
            sequence = False
            if neigbour_after:
                sequence = neigbour_after.sequence - 1
                # 1
                while neigbour_before and neigbour_before.sequence == sequence:
                    neigbour_before.sequence = neigbour_before.sequence - 1
                    position -= 1
                    neigbour_before = position > 0 and this_parent_nodes[position-1] or False
            elif neigbour_before:
                sequence = neigbour_before.sequence + 1
            if sequence is not False:
                self.sudo().sequence = sequence
