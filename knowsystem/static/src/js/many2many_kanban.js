/** @odoo-module **/

import relationalFields from "web.relational_fields";
import fieldRegistry from "web.field_registry";

const knowSystemKanban = relationalFields.FieldMany2Many.extend({
    events: _.extend({}, relationalFields.FieldMany2Many.prototype.events, {
        'click .article_select': '_articleSelect',
    }),
    /**
     * @private
     * @param {MouseEvent} event
     * The method to add to selection
    */        
    _articleSelect: function (event) {
        event.preventDefault();
        event.stopPropagation();
        this.trigger_up("field_changed", {
            dataPointID: this.dataPointID,
            changes: _.object(["selected_article_ids"], [{
                operation: "ADD_M2M",
                ids: [{"id": parseInt(event.currentTarget.id)}],
            }])
        });
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to save the views
    */ 
    _onOpenRecord: function (event) {
        this._super.apply(this, arguments);
        this._rpc({
            model: "knowsystem.article",
            method: "update_number_of_views",
            args: [[parseInt(event.target.id)]],
            context: {},
        })
    },
});


fieldRegistry.add('many2many_knowsystem_kanban', knowSystemKanban);

export default knowSystemKanban;
