odoo.define('knowsystem.FromView', function (require) {

    var FormRender = require('web.FormRenderer');

    FormRender.include({
        _add_OnClickAction : function($el, node) {
            var self = this;
            console.log('Valor recibido');
        }
    });
});