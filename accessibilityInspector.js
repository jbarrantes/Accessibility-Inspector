/*!
 * Copyright (c) 2010 Jose Barrantes
 * Licensed under the MIT License (LICENSE.txt)
 *
 * Accessibility Inspector
 * The purpose of this script is to help with the revision of web pages,
 * highlighting potential accessibility issues.
 */
jQuery(function($) {
    var BORDER_COLOR     = 'white';
    var TEXT_COLOR       = 'black';
    var ARROW_HEAD_ANGLE = 1.8 * Math.PI;
    var ARROW_SIZE       = 20;
    var DOT_SIZE         = ARROW_SIZE / 4;

    var PI_X_2           = 2 * Math.PI;
    var ARROW_HEAD_DELTA = ARROW_HEAD_ANGLE / 2;

    function drawArrow(ctx, x1, y1, x2, y2, color) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var a  = Math.atan2(dy, dx);

        var x3 = x2 + ARROW_SIZE * Math.cos(a - ARROW_HEAD_DELTA);
        var y3 = y2 + ARROW_SIZE * Math.sin(a - ARROW_HEAD_DELTA);
        var x4 = x2 + ARROW_SIZE * Math.cos(a + ARROW_HEAD_DELTA);
        var y4 = y2 + ARROW_SIZE * Math.sin(a + ARROW_HEAD_DELTA);

        ctx.save();

        // Outline
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = 5;

        // Circle
        ctx.beginPath();
        ctx.arc(x1, y1, DOT_SIZE, 0, PI_X_2, false);
        ctx.stroke();

        // Line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.stroke();

        // Fill
        ctx.fillStyle   = color;
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1;

        // Circle
        ctx.beginPath();
        ctx.arc(x1, y1, DOT_SIZE, 0, PI_X_2, false);
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x4, y4);
        ctx.fill();

        ctx.restore();
    }

    function displayText(ctx, txt, x, y) {
        ctx.save();

        ctx.strokeStyle = BORDER_COLOR;
        ctx.fillStyle = TEXT_COLOR;
        ctx.lineWidth = 3;

        ctx.strokeText(txt, x, y);
        ctx.fillText(txt, x, y);

        ctx.restore();
    }

    function highlightField(ctx, $field, color, txt) {
        var offset = $field.offset();
        var x      = Math.floor(offset.left);
        var y      = Math.floor(offset.top);
        var w      = Math.ceil($field.outerWidth());
        var h      = Math.ceil($field.outerHeight());

        ctx.save();

        ctx.textAlign = 'right';

        displayText(ctx, txt, x + w, y);

        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        ctx.restore();
    }

    /*
     * This filter is necessary, since the :visible selector on jQuery allows
     * elements with visibility: 'hidden'
     */
    function reallyVisible(index) {
        return $(this).css('visibility') != 'hidden';
    }

    function checkAltAndTitle(ctx) {
        $('img:visible').filter(reallyVisible).each(function() {
            var $img = $(this);

            if (!this.hasAttribute('alt')) {
                highlightField(ctx, $img, 'red', 'alt?');
            }
        });

        //XXX: title was not read by screen readers
    }

    function checkLabelFor(ctx) {
        $('label:visible').filter(reallyVisible).each(function() {
            var $label = $(this);
            var forId  = $label.attr('for');

            if (forId) {
                var $field = $('#' + forId);

                if ($field.is(':visible')) {
                    drawArrow(ctx,
                              $label.offset().left + $label.outerHeight() / 2,
                              $label.offset().top  + $label.outerHeight() / 2,
                              $field.offset().left + $field.outerHeight() / 2,
                              $field.offset().top  + $field.outerHeight() / 2,
                              'lawngreen');
                } else {
                    highlightField(ctx, $label, 'red', 'for ' + forId + '?');
                }
            } else {
                highlightField(ctx, $label, 'orange', 'for?');
            }
        });

        // Show fields without a label
        $('input:visible:not([type="image"]):not([type="button"]):not([type="submit"]):not([type="reset"])')
        .filter(reallyVisible).each(function() {
            var $field = $(this);
            var id     = $field.attr('id');

            if (id) {
                var $labels = $('label[for="' + id + '"]');

                if ($labels.length == 0) {
                    highlightField(ctx, $field, 'orange', 'label?');
                }
            } else {
                highlightField(ctx, $field, 'yellow', 'id?');
            }
        });
    }

    function checkTabindex(ctx) {
        var tabindex_$field = [];

        // If no element has tabindex, no warning is displayed for that
        var useTabindex = $('a[tabindex], :input[tabindex]').length > 0;

        $('a:visible, :input:visible').filter(reallyVisible).each(function(i, el) {
            var $field   = $(el);
            var tabindex = $field.attr('tabindex');

            if (tabindex) {
                if (tabindex >= 0) {
                    tabindex_$field.push([tabindex, $field, i]);
                } else {
                    // If negative, element is removed from the tab order
                    highlightField(ctx, $field, 'greenyellow', 'tabindex=-1');
                }
            } else {
                tabindex_$field.push([Infinity, $field, i]);

                if (useTabindex) {
                    highlightField(ctx, $field, 'orange', '');
                }
            }
        });

        // Elements with lower tabindex first
        tabindex_$field.sort(function(a, b) {
            if (isFinite(a[0])) {
                if (isFinite(b[0])) {
                    if (a[0] === b[0]) {
                        return a[2] - b[2];
                    }

                    return a[0] - b[0];
                }

                return -1;
            }

            if (isFinite(b[0])) {
                return 1;
            }

            return a[2] - b[2];
        });

        var x0 = 0;
        var y0 = 0;
        for (var i = 0; i < tabindex_$field.length; ++i) {
            var tabindex = tabindex_$field[i][0];
            var $field   = tabindex_$field[i][1];

            var x1 = $field.offset().left - (ARROW_SIZE / 2);
            var y1 = $field.offset().top + $field.outerHeight() / 2;

            if (!useTabindex || isFinite(tabindex)) {
                drawArrow(ctx, x0, y0, x1, y1, 'darkblue');
            } else {
                drawArrow(ctx, x0, y0, x1, y1, 'darkred');
            }

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = 'black';

            if (isFinite(tabindex)) {
                displayText(ctx, $field.attr('tabindex'), x1 + 5, y1);
            }

            ctx.restore();

            // Current point is the starting point for the next arrow
            x0 = x1;
            y0 = y1;
        }
    }

    function checkAccesskey(ctx) {
        $(':visible[accesskey]').filter(reallyVisible).each(function() {
            var $item = $(this);
            var key   = $item.attr('accesskey');

            highlightField(ctx, $item, 'silver', 'K=' + key);
        });
    }

    function updateCanvas() {
        $canvas.attr('width',  window.innerWidth - 2)
        .attr('height', window.innerHeight - 2)
        .css({
            width:  window.innerWidth - 2 + 'px',
            height: window.innerHeight - 2 + 'px'
        });

        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        var oy = $('html').scrollTop();
        var ox = $('html').scrollLeft();
        ctx.translate(-ox, -oy);
        
        ctx.font = '15px Arial';

        checkAltAndTitle(ctx);
        checkLabelFor(ctx);
        checkTabindex(ctx);
        checkAccesskey(ctx);
        //TODO: add additional checks

        ctx.restore();
    }

    // Canvas for information rendering (transparent to mouse events)
    var $canvas = $('<canvas></canvas>')
        .attr('width',  window.innerWidth - 2)
        .attr('height', window.innerHeight - 2)
        .css({
            position:         'fixed',
            top:              '0px',
            left:             '0px',
            width:            window.innerWidth - 2 + 'px',
            height:           window.innerHeight - 2 + 'px',
            'z-index':        1000000,
            'pointer-events': 'none',
            border:           '1px solid gray'
        })
        .appendTo('body');

    var canvas = $canvas.get(0);

    setInterval(updateCanvas, 300);
});
