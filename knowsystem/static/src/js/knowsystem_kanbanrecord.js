/** @odoo-module **/

import KanbanRecord from "web.KanbanRecord";


const KnowSystemKanbanRecord = KanbanRecord.extend({
    events: _.extend({}, KanbanRecord.prototype.events, {
        "click .article_select": "_articleSelect",
        "click .knowsystem_open_global": "_openRecord", 
    }),
    /** 
    * The method to pass selection to the controller
    */
    _updateSelect: function (event, selected) {
        this.trigger_up('select_record', {
            originalEvent: event,
            resID: this.id,
            selected: selected,
        });
    },
    /** 
    * The method to mark the article selected / disselected in the interface
    */
    _updateRecordView: function (select) {
        var kanbanCard = this.$el,
            checkBox = this.$el.find(".article_select");
        if (select) {
            checkBox.removeClass("fa-square-o");
            checkBox.addClass("fa-check-square-o");
            kanbanCard.addClass("knowkanabanselected");
        }
        else {
            checkBox.removeClass("fa-check-square-o");
            checkBox.addClass("fa-square-o");
            kanbanCard.removeClass("knowkanabanselected");
        };
    },
    /** 
    * The method to add to / remove from selection
    */
    _articleSelect: function (event) {
        event.preventDefault();
        event.stopPropagation();
        var checkBox = this.$el.find(".article_select");
        if (checkBox.hasClass("fa-square-o")) {
            this._updateRecordView(true)
            this._updateSelect(event, true);
        }
        else {
            this._updateRecordView(false);
            this._updateSelect(event, false);
        }
    },
});

export default KnowSystemKanbanRecord;
