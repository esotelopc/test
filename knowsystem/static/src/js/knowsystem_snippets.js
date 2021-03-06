odoo.define('knowsystem.snippets.options', function (require) {
"use strict";
    /** implemented based on Odoo mass_mailing **/

    var options = require('web_editor.snippets.options');
    const { ColorpickerWidget } = require('web.Colorpicker');
    const { _lt } = require('web.core');

    options.registry["sizing_knowsystem_x"] = options.Class.extend({
        /*
        * Option to resize snippets
        */
        start: function () {
            var def = this._super.apply(this, arguments);
            this.containerWidth = this.$target.parent().closest("td, table, div").width();
            var self = this;
            var offset, sib_offset, target_width, sib_width;
            this.$overlay.find(".o_handle.e, .o_handle.w").removeClass("readonly");
            this.isIMG = this.$target.is("img");
            if (this.isIMG) {
                this.$overlay.find(".o_handle.w").addClass("readonly");
            }
            var $body = $(this.ownerDocument.body);
            this.$overlay.find(".o_handle").on('mousedown', function (event) {
                event.preventDefault();
                var $handle = $(this);
                var compass = false;
                _.each(['n', 's', 'e', 'w'], function (handler) {
                    if ($handle.hasClass(handler)) { compass = handler; }
                });
                if (self.isIMG) { compass = "image"; }
                $body.on("mousemove.knowsystem_width_x", function (event) {
                    event.preventDefault();
                    offset = self.$target.offset().left;
                    target_width = self.get_max_width(self.$target);
                    if (compass === 'e' && self.$target.next().offset()) {
                        sib_width = self.get_max_width(self.$target.next());
                        sib_offset = self.$target.next().offset().left;
                        self.change_width(event, self.$target, target_width, offset, true);
                        self.change_width(event, self.$target.next(), sib_width, sib_offset, false);
                    };
                    if (compass === 'w' && self.$target.prev().offset()) {
                        sib_width = self.get_max_width(self.$target.prev());
                        sib_offset = self.$target.prev().offset().left;
                        self.change_width(event, self.$target, target_width, offset, false);
                        self.change_width(event, self.$target.prev(), sib_width, sib_offset, true);
                    };
                    if (compass === 'image') {
                        self.change_width(event, self.$target, target_width, offset, true);
                    };
                });
                $body.one("mouseup", function () {
                    $body.off('.knowsystem_width_x');
                });
            });
            return def;
        },
        change_width: function (event, target, target_width, offset, grow) {
            target.css("width", Math.round(grow ? (event.pageX - offset) : (offset + target_width - event.pageX)));
            this.trigger_up('cover_update');
        },
        get_int_width: function (el) {
            return parseInt($(el).css("width"), 10);
        },
        get_max_width: function ($el) {
            return this.containerWidth - _.reduce(_.map($el.siblings(), this.get_int_width), function (memo, w) { return memo + w; });
        },
        onFocus: function () {
            this._super.apply(this, arguments);
            if (this.$target.is("td, th")) {
                this.$overlay.find(".o_handle.e, .o_handle.w").toggleClass("readonly", this.$target.siblings().length === 0);
            }
        },
    });

    options.registry.BackgroundImage = options.registry.BackgroundImage.extend({
        /* 
         * Adding compatibility for the outlook
        */ 
        start: function () {
            this._super();
            if (this.snippets && this.snippets.split('.')[0] === "knowsystem") {
                var $table_target = this.$target.find('table:first');
                if ($table_target.length) {
                    this.$target = $table_target;
                }
            }
        }
    });

    options.registry.ImageOptimize.include({

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        async updateUIVisibility() {
            await this._super(...arguments);

            // The image shape option should work correctly with this update of the
            // ImageOptimize option but unfortunately, SVG support in mail clients
            // prevents the final rendering of the image. For now, we disable the
            // feature.
            const imgShapeContainerEl = this.el.querySelector('.o_we_image_shape');
            if (imgShapeContainerEl) {
                imgShapeContainerEl.classList.toggle('d-none', !odoo.debug);
            }
        },

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        _getCSSColorValue(color) {
            const doc = this.options.document;
            if (doc && doc.querySelector('.knowsystem_iframe') && !ColorpickerWidget.isCSSColor(color)) {
                const tempEl = doc.body.appendChild(doc.createElement('div'));
                tempEl.className = `bg-${color}`;
                const colorValue = window.getComputedStyle(tempEl).getPropertyValue("background-color").trim();
                tempEl.parentNode.removeChild(tempEl);
                return ColorpickerWidget.normalizeCSSColor(colorValue).replace(/"/g, "'");
            }
            return this._super(...arguments);
        },
        /**
         * @override
         */
        async _renderCustomWidgets(uiFragment) {
            await this._super(...arguments);

            const imgShapeTitleEl = uiFragment.querySelector('.o_we_image_shape we-title');
            if (imgShapeTitleEl) {
                const warningEl = document.createElement('i');
                warningEl.classList.add('fa', 'fa-exclamation-triangle', 'ml-1');
                warningEl.title = _lt("Be aware that this option may not work on many mail clients");
                imgShapeTitleEl.appendChild(warningEl);
            }
        },
    });




});
