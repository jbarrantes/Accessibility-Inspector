/*!
 * Copyright (c) 2010 Jose Barrantes
 * Licensed under the MIT License (LICENSE.txt)
 *
 * Accessibility Inspector
 * The purpose of this script is to help with the revision of web pages,
 * highlighting potential accessibility issues.
 */
jQuery(function($) {
    function drawArrow(ctx, x1, y1, x2, y2, color) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var a  = Math.atan2(dy, dx);
        var x3 = x2 + 15 * Math.cos(a - Math.PI * 0.9);
        var y3 = y2 + 15 * Math.sin(a - Math.PI * 0.9);
        var x4 = x2 + 15 * Math.cos(a + Math.PI * 0.9);
        var y4 = y2 + 15 * Math.sin(a + Math.PI * 0.9);

        ctx.save();
        ctx.fillStyle   = color;
        ctx.strokeStyle = color;

        // Circle
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, 2 * Math.PI, false);
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

    function showMessage(ctx, $field, color, txt) {
        ctx.save();

        ctx.strokeStyle = color;
        ctx.strokeRect($field.offset().left - 0.5, $field.offset().top - 0.5,
                       $field.outerWidth() + 1, $field.outerHeight() + 1);

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.fillRect($field.offset().left, $field.offset().top,
                     $field.outerWidth(), $field.outerHeight());
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = 'black';
        ctx.textAlign = 'right';
        ctx.fillText(txt, $field.offset().left + $field.outerWidth(),
                          $field.offset().top - 2);

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

            if (this.hasAttribute('alt')) {
                if ($img.attr('alt') == '') {
                    showMessage(ctx, $img, 'orange', 'alt=""');
                }
            } else {
                showMessage(ctx, $img, 'red', 'alt?');
            }
        });

        $('a:visible').filter(reallyVisible).each(function() {
            var $a = $(this);

            if (this.hasAttribute('title')) {
                if ($a.attr('title') == '') {
                    showMessage(ctx, $a, 'yellow', 'title=""');
                }
            } else {
                showMessage(ctx, $a, 'orange', 'title?');
            }
        });
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
                    showMessage(ctx, $label, 'red', 'for ' + forId + '?');
                }
            } else {
                showMessage(ctx, $label, 'orange', 'for?');
            }
        });

        // Show fields without a label
        $('input:visible:not([type="image"]):not([type="button"]):not([type="submit"]):not([type="reset"])')
        .filter(reallyVisible).each(function() {
            var $field = $(this);
            var id     = $field.attr('id');

            if (id) {
                var $labels = $('label[for="' + id + '"]');

                if ($labels.size() == 0) {
                    showMessage(ctx, $field, 'orange', 'label?');
                }
            } else {
                showMessage(ctx, $field, 'yellow', 'id?');
            }
        });
    }

    function checkTabindex(ctx) {
        var tabindex_$field = [];

        // If no element has tabindex, no warning is displayed for that
        var useTabindex = $('a[tabindex], :input[tabindex]').size() > 0;

        $('a:visible, :input:visible').filter(reallyVisible).each(function() {
            var $field   = $(this);
            var tabindex = $field.attr('tabindex');

            if (tabindex) {
                if (tabindex >= 0) {
                    tabindex_$field.push([tabindex, $field]);
                } else {
                    // If negative, element is removed from the tab order
                    showMessage(ctx, $field, 'greenyellow', 'tabindex=-1');
                }
            } else {
                tabindex_$field.push([Infinity, $field]);
                if (useTabindex) {
                    showMessage(ctx, $field, 'orange', '');
                }
            }
        });

        // Elements with lower tabindex first (relies on stable sort)
        tabindex_$field.sort(function(a, b) {
            return a[0] - b[0];
        });

        var x0 = 5;
        var y0 = 5;
        for (var i = 0; i < tabindex_$field.length; ++i) {
            var tabindex = tabindex_$field[i][0];
            var $field   = tabindex_$field[i][1];

            var x1 = $field.offset().left + $field.outerWidth() / 2;
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
                ctx.fillText($field.attr('tabindex'), x1 + 5, y1);
            } else {
                ctx.fillText('?', x1 + 5, y1);
            }

            ctx.restore();

            // Current point is the starting point for the next arrow
            x0 = x1;
            y0 = y1;
        }
    }

    function updateCanvas() {
        var ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        checkAltAndTitle(ctx);
        checkLabelFor(ctx);
        checkTabindex(ctx);
        //TODO: add additional checks
    }

    // Canvas for information rendering (transparent to mouse events)
    var canvas = $('<canvas></canvas>')
        .attr('width',  $(document).width())
        .attr('height', $(document).height())
        .css({
            position:         'absolute',
            top:              '0px',
            left:             '0px',
            'z-index':        1000000,
            'pointer-events': 'none'
        })
        .appendTo('body')
        .get(0);

    setInterval(updateCanvas, 500);
});
