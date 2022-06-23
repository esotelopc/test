/** @odoo-module **/

import KnowSystemKanbanController from "@knowsystem/js/kwowsystem_kanbancontroller";
import KnowSystemKanbanModel from "@knowsystem/js/knowsystem_kanbanmodel";
import KnowSystemKanbanRenderer from "@knowsystem/js/knowsystem_kanbanrender";
import KanbanView from "web.KanbanView";
import viewRegistry from "web.view_registry";
import { _lt } from "web.core";

const KnowSystemKanbanView = KanbanView.extend({
    config: _.extend({}, KanbanView.prototype.config, {
        Controller: KnowSystemKanbanController,
        Model: KnowSystemKanbanModel,
        Renderer: KnowSystemKanbanRenderer,
    }),
    display_name: _lt("Knowledge Base"),
    groupable: false,
});

viewRegistry.add("knowsystem_kanban", KnowSystemKanbanView);

export default KnowSystemKanbanView;
