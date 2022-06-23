/** @odoo-module **/

import Widget from "web.Widget";
import SystrayMenu from "web.SystrayMenu";
import session from "web.session";
import Context from "web.Context";
import { _lt} from "web.core";
import { browser } from "@web/core/browser/browser";

/*
 * cannot use useService "router" since it might be not available while clicking on the button
 * so we rely upon browser current hash 
*/  
function parseString(str) {
    const parts = str.split("&");
    const result = {};
    for (let part of parts) {
        const [key, value] = part.split("=");
        const decoded = decodeURIComponent(value || "");
        result[key] = !decoded || isNaN(decoded) ? decoded : Number(decoded);
    }
    return result;
}

const systrayKnowsystem = Widget.extend({
    template: "systrayKnowSystem",
    events: {"click": "_onOpenKnowSystemSearch"},
    /**
     * Overwrite to pass to widget whether knowsystem systray is turned on
    */
    init: function () {
        this.show_knowsystem_quick = session.show_knowsystem_quick;
        this._super.apply(this, arguments);       
    },
    /**
     * The method to open wizard for quick searching knowsystem articles
    */
    async _onOpenKnowSystemSearch(ev) {
        event.preventDefault();
        event.stopPropagation();
        var curModel = false,
            curIds = [],
            hash = browser.location.hash,
            curHash = hash && hash !== "#" ? parseString(hash.slice(1)) : {};
        if (curHash.model) {
            curModel = curHash.model;
            if (curHash.id) {
                curIds = [curHash.id];
            };
        };       
        const defaultTags = await this._rpc({
            model: "knowsystem.tag",
            method: "action_return_tags_for_document",
            args: [curModel, curIds],
        })
        const KnowSystemContext = {
            default_tag_ids: defaultTags,
            default_no_selection: true,
            form_view_ref: "knowsystem.article_search_form_view",
        };
        const context = new Context(session.user_context, KnowSystemContext).eval();
        const action = {
            name: _lt("Articles Quick Search"),
            type: "ir.actions.act_window",
            res_model: "article.search",
            views: [[false, "form"]],
            target: "new",
            context: context,
        };
        this.do_action(action);
    },
});

SystrayMenu.Items.push(systrayKnowsystem);

export default systrayKnowsystem
