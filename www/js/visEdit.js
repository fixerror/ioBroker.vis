/**
 *  ioBroker.vis
 *  https://github.com/ioBroker/ioBroker.vis
 *
 *  Copyright (c) 2013-2014 bluefox https://github.com/GermanBluefox, hobbyquaker https://github.com/hobbyquaker
 *  Creative Common Attribution-NonCommercial (CC BY-NC)
 *
 *  http://creativecommons.org/licenses/by-nc/4.0/
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

// visEdit - the ioBroker.vis Editor

'use strict';

vis = $.extend(true, vis, {
    $copyWidgetSelectView: null,
    undoHistoryMaxLength:  50,
    $selectView:           null,
    $selectActiveWidgets:  null,
    activeWidgets:         [],
    oldActiveWidgets:      [],
    isStealCss:            false,
    gridWidth:             undefined,
    clipboard:             null,
    undoHistory:           [],
    selectable:            true,
    groupsState:           {'fixed': true, 'common': true},
    // Array with all objects (Descriptions of objects)
    objects:               null,
    config:                {},

    editInit: function () {
        var that = this;
        this.editLoadConfig();
        this.$selectView = $('#select_view');
        this.$copyWidgetSelectView = $('#rib_wid_copy_view');
        this.$selectActiveWidgets = $('#select_active_widget');
        // @SJ cannot select menu and dialogs if it is enabled
        //$("#wid_all_lock_function").trigger("click");
        if (local) $("#ribbon_tab_datei").show();

        this.editInitDialogs();
        this.editInitMenu();
        $('#attr_wrap').tabs();
        $('#pan_add_wid').resizable({
            handles:  'e',
            maxWidth: 570,
            minWidth: 190
        });
        $('#pan_attr').resizable({
            handles: 'w',
            maxWidth: 670,
            minWidth: 100
        });

        $(window).resize(function () {
            layout();
        });

        function layout() {
            $('#panel_body').height(parseInt($(window).height() - $('#menu_body').height() -3));
            $('#vis_wrap').width(parseInt($(window).width() - $('#pan_add_wid').width() - $('#pan_attr').width() - 1));
        }

        layout();

        $('#vis-version').html(this.version);


        $('#button_undo')
            .click(this.undo)
            .addClass('ui-state-disabled')
            .hover(
            function () {
                $(this).addClass('ui-state-hover');
            },
            function () {
                $(this).removeClass('ui-state-hover');
            });

        $('.widget-helper').remove();

        $('input.vis-editor').button();

        $('button.vis-editor').button();

        $('select.vis-editor').each(function () {
            $(this).multiselect({
                multiple:         false,
                classes:          $(this).attr("id"),
                header:           false,
                selectedList:     1,
                minWidth:         $(this).attr('data-multiselect-width'),
                height:           $(this).attr('data-multiselect-height'),
                checkAllText:     _('Check all'),
                uncheckAllText:   _('Uncheck all'),
                noneSelectedText: _('Select options')
            });
        });

        $('select.vis-editor-large').each(function () {
            $(this).multiselect({
                multiple: false,
                header: false,
                //noneSelectedText: false,
                selectedList: 1,
                minWidth: 250,
                height: 410,
                checkAllText: _('Check all'),
                uncheckAllText: _('Uncheck all'),
                noneSelectedText: _('Select options')
            });

        });

        $('select.vis-editor-xlarge').each(function () {
            $(this).multiselect({
                multiple: false,
                header: false,
                // noneSelectedText: false,
                selectedList: 1,
                minWidth: 420,
                height: 340,
                checkAllText: _('Check all'),
                uncheckAllText: _('Uncheck all'),
                noneSelectedText: _('Select options')
            });
        });

        this.$selectActiveWidgets.multiselect({
            classes:          this.$selectActiveWidgets.attr("id"),
            header:           true,
            selectedList:     2,
            minWidth:         this.$selectActiveWidgets.attr('data-multiselect-width'),
            height:           this.$selectActiveWidgets.attr('data-multiselect-height'),
            checkAllText:     _('Check all'),
            uncheckAllText:   _('Uncheck all'),
            noneSelectedText: _('none selected')
        }).change(function () {
            var widgets = [];
            $(this).multiselect('getChecked').each(function () {
                widgets.push(this.value);
            });
            for (var i = that.activeWidgets.length - 1; i >= 0; i--) {
                var pos = widgets.indexOf(that.activeWidgets[i]);
                if (pos == -1) that.activeWidgets.splice(pos, 1);
            }
            for (var i = 0; i < widgets.length; i++) {
                if (that.activeWidgets.indexOf(widgets[i]) == -1) {
                    that.activeWidgets.push(widgets[i]);
                    that.actionHighlighWidget(widgets[i]);
                }
            }
            that.inspectWidgets();
        });
        // Button Click Handler

        $('#export_view').click(function () {
            vis.exportView(false);
        });

        $('#import_view').click(function () {
            $('#textarea_import_view').html('');
            $('#dialog_import_view').dialog({
                autoOpen: true,
                width: 800,
                height: 600,
                modal: true,
                open: function (event, ui) {
                    $('[aria-describedby="dialog_import_view"]').css('z-index', 1002);
                    $('.ui-widget-overlay').css('z-index', 1001);
                    $('#start_import_view').click(function () {
                        vis.importView();
                    });
                    $('#name_import_view').show();
                }
            });
        });

        $('#create_instance').button({icons: {primary: 'ui-icon-plus'}}).click(this.generateInstance);

        this.initStealHandlers();

        $('.vis-inspect-view-css').change(function () {
            var $this = $(this);
            var attr = $this.attr('id').slice(17);
            var val = $this.val();
            $('#visview_' + that.activeView).css(attr, val);
            // Update background-xxx if changed background and vice versa
            if (attr.match(/^background-/)) {
                $('#inspect_view_css_background').val($('#visview_' + that.activeView).css('background'));
            } else if (attr == 'background'){
                $('.vis-inspect-view-css').each(function () {
                    var attr = $(this).attr('id').slice(17);
                    if (attr.match(/^background-/)) {
                        $(this).val($('#visview_' + that.activeView).css(attr));
                    }
                });
            }

            if (!that.views[that.activeView].settings.style) that.views[that.activeView].settings.style = {};
            that.views[that.activeView].settings.style[attr] = val;
            that.save();
        }).keyup(function () {
            $(this).trigger('change');
        });

        $('.vis-inspect-view').change(function () {
            var $this = $(this);
            var attr = $this.attr('id').slice(13);
            var val = $this.val();
            that.views[that.activeView].settings[attr] = val;
            that.save();
        }).keyup(function () {
            $(this).trigger('change');
        });



        $('#screen_size').change(function () {
            var val = $(this).find('option:selected').val();
            if (val == 'user') {
                $('#screen_size_x').removeAttr('disabled');
                $('#screen_size_y').removeAttr('disabled');
            } else {
                var size = val.split('x');
                $('#screen_size_x').val(size[0]).trigger('change').prop('disabled', true);
                $('#screen_size_y').val(size[1]).trigger('change').prop('disabled', true);
            }
        });

        $('#screen_size_x').change(function () {
            var x = $('#screen_size_x').val();
            var y = $('#screen_size_y').val();
            if (x <= 0) {
                $('#size_x').hide();
            } else {
                $('#size_x').css('left', (parseInt(x, 10) + 1) + 'px').show();
                $('#size_y').css('width', (parseInt(x, 10) + 3) + 'px');
                if (y > 0) {
                    $('#size_x').css('height', (parseInt(y, 10) + 3) + 'px');
                }
            }
            if (that.views[that.activeView].settings.sizex != x) {
                that.views[that.activeView].settings.sizex = x;
                that.setViewSize(that.activeView);
                that.save();
            }

        }).keyup(function () {
            $(this).trigger('change');
        });

        $('#screen_hide_description').change(function () {
            var val = $('#screen_hide_description')[0].checked;
            if (that.views[that.activeView].settings.hideDescription != val) {
                that.views[that.activeView].settings.hideDescription = val;
                if (typeof hqWidgets != 'undefined') {
                    hqWidgets.SetHideDescription(val);
                }
                that.save();
            }
        }).keyup(function () {
            $(this).trigger('change');
        });

        $('#screen_size_y').change(function () {
            var x = $('#screen_size_x').val();
            var y = $('#screen_size_y').val();
            if (y > 0) {
                $('#size_y').css('top', (parseInt(y, 10) + 1) + 'px').show();
                $('#size_x').css('height', (parseInt(y, 10) + 3) + 'px');
                if (x > 0) {
                    $('#size_y').css('width', (parseInt(x, 10) + 3) + 'px');
                }
            } else {
                $('#size_y').hide();

            }
            if (that.views[that.activeView].settings.sizey != y) {
                that.views[that.activeView].settings.sizey = y;
                that.setViewSize(that.activeView);
                that.save();
            }

        }).keyup(function () {
            $(this).trigger('change');
        });

        $('#snap_type').change(function () {
            var snapType = $('#snap_type option:selected').val();
            if (that.views[that.activeView].settings.snapType != snapType) {
                that.views[that.activeView].settings.snapType = snapType;
                that.save();
            }
        });

        $('#grid_size').change(function () {
            var gridSize = $(this).val();
            if (that.views[that.activeView].settings.gridSize != gridSize) {
                that.views[that.activeView].settings.gridSize = gridSize;
                that.save();
            }
        });

        $('#dev_show_html').button({}).click(function () {
            var wid_id = $('#' + that.activeWidgets[0]).attr('id');
            that.inspectWidgets();

            var $target = $('#' + wid_id);
            var $clone = $target.clone();
            $clone.wrap('<div>');
            var html = $clone.parent().html();

            html = html
                .replace('vis-widget ', 'vis-widget_prev ')
                .replace('vis-widget-body', 'vis-widget-prev-body')
                .replace('ui-draggable', ' ')
                .replace('ui-resizable', ' ')
                .replace('<div class="editmode-helper"></div>', '')
                .replace(/(id=")[A-Za-z0-9\[\]._]+"/g, '')
                .replace(/(?:\r\n|\r|\n)/g, '')
                .replace(/[ ]{2,}/g, ' ');

            html = 'data-vis-prev=\'<div id="prev_' + that.views[that.activeView].widgets[wid_id].tpl + '" style=" position: relative; text-align: initial;padding: 4px ">' + html.toString() + '\'';

            $('body').append('<div id="dec_html_code"><textarea style="width: 100%; height: 100%">' + html + '</textarea></div>')
            $('#dec_html_code').dialog({
                width: 800,
                height: 600,
                close: function () {
                    $('#dec_html_code').remove()
                }
            })

        });

        // Bug in firefox or firefox is too slow or too fast
        /*setTimeout(function() {

         if (document.getElementById('select_active_widget')._isOpen === undefined) {
         $('#select_active_widget').html('<option value="none">' + _('none selected') + '</option>');
         if (vis.activeView && vis.views && vis.views[vis.activeView] && vis.views[vis.activeView].widgets) {
         for (var widget in vis.views[vis.activeView].widgets) {
         var obj = $("#" + vis.views[vis.activeView].widgets[widget].tpl);
         $('#select_active_widget').append("<option value='" + widget + "'>" + this.getWidgetName(vis.activeView, widget) + </option>");
         }
         }
         $('#select_active_widget').multiselect('refresh');
         }

         }, 10000);*/

        // Instances
        if (typeof storage !== 'undefined' && local == false) {
            // Show what's new
            if (storage.get('lastVersion') != vis.version) {
                // Read
                storage.set('lastVersion', vis.version);
                // Read io-addon.json
                $.ajax({
                    url: 'io-addon.json',
                    cache: false,
                    success: function (data) {

                        try {
                            var ioaddon = data; // @bluefox: this is already parsed by jQuery.ajax! JSON.parse(data);
                            if (ioaddon.whatsNew) {
                                for (var i = 0; i < ioaddon.whatsNew.length; i++) {
                                    var text = ioaddon.whatsNew[i];
                                    if (typeof text != 'string') {
                                        text = ioaddon.whatsNew[i][that.language] || ioaddon.whatsNew[i]['en'];
                                    }
                                    // Remove modifier information like (Bluefox) or (Hobbyquaker)
                                    if (text[0] == '(') {
                                        var j = text.indexOf(')');
                                        if (j != -1) {
                                            text = text.substring(j + 1);
                                        }
                                    }
                                    that.showHint('<b>' + _('New:') + '</b>' + text, 30000, 'info');
                                }
                            }
                        } catch (e) {
                            that.conn.logError('Cannot parse io-addon.json ' + e);
                        }
                    }
                });
            }
            try {
                // Load groups state and positions
                var groups = storage.get('groups');
                try {
                    if (groups) this.groupsState = JSON.parse(groups);
                } catch (e) {
                    console.log('Cannot parse groups: ' + groups);
                }
            } catch (e) {

            }
        }
    },
    editInitDialogs: function () {

        $('#dialog_about').dialog({
            autoOpen: false,
            width: 600,
            height: 500,
            position: {my: 'center', at: 'center', of: $('#panel_body')}
        });

        $('#dialog_shortcuts').dialog({
            autoOpen: false,
            width: 600,
            height: 500,
            position: {my: 'center', at: 'center', of: $('#panel_body')}
        });

    },
    editInitMenu: function () {
        var that = this;
        $('#menu.sf-menu').superclick({
            hoverClass: 'sfHover',
            uiClass:    'ui-state-hover',  // jQuery-UI modified
            pathLevels: 1,
            cssArrows:  false,
            disableHI:  false
        });

        $('li.ui-state-default').hover(
            function () {
                $(this).addClass('ui-state-hover');
            },
            function () {
                $(this).removeClass('ui-state-hover');
            }
        );

        $('#menu_body').tabs({
            active: 2,
            collapsible: true
        });

        // Tabs open Close

        $('#menu_body > ul > li').click(function () {
            $(window).trigger('resize');
        });

        // Theme select Editor
        var lastTheme = storage.get('vistheme');
        if (lastTheme) {
            $('#editor_theme').remove();
            $('head').prepend('<link rel="stylesheet" type="text/css" href="lib/css/themes/jquery-ui/' + lastTheme + '/jquery-ui.min.css" id="editor_theme"/>');
            $('[data-theme=' + lastTheme + ']').addClass('ui-state-active');
        }

        $('#ul_theme li a').click(function () {
            var theme = $(this).data('info');
            // deselect all
            $('#ul_theme li').removeClass('ui-state-active');
            $('#editor_theme').remove();
            $('head').prepend('<link rel="stylesheet" type="text/css" href="lib/css/themes/jquery-ui/' + theme + '/jquery-ui.min.css" id="editor_theme"/>');
            //vis.additionalThemeCss(theme);
            setTimeout(function(){
                $('#scrollbar_style').remove();
                $('head').prepend('<style id="scrollbar_style">html{}::-webkit-scrollbar-thumb {background-color: '+$(".ui-widget-header ").first().css("background-color")+'}</style>');
            },300);

            // Select active theme in menu
            $('[data-theme=' + theme + ']').addClass('ui-state-active');

            storage.set('vistheme', theme);
            that.save();
        });

        // Theme select View
        $('#inspect_view_theme').change(function () {
            var theme = $(this).val();
            that.views[that.activeView].settings.theme = theme;
            that.addViewStyle(that.activeView, theme);
            //that.additionalThemeCss(theme);
            that.save();
        });

        //language
        $('[data-language=' + ((typeof this.language === 'undefined') ? 'en' : (this.language || 'en')) + ']').addClass('ui-state-active');

        $('.language-select').click(function () {
            $('[data-language=' + that.language + ']').removeClass('ui-state-active');
            that.language = $(this).data('language');
            $(this).addClass('ui-state-active');
            if (typeof systemLang != 'undefined') systemLang = that.language;
            setTimeout(function () {
                translateAll();
            }, 0)

        });


        $('#m_about').click(function () {
            $('#dialog_about').dialog('open')
        });
        $('#m_shortcuts').click(function () {
            $('#dialog_shortcuts').dialog('open')
        });
        //$("#m_setup").click(function () {
        //    $("#dialog_setup").dialog("open")
        //});

        // Ribbon icons Golbal

        $('.icon-on-iconbar')
            .hover(
            function () {
                $(this).parent().addClass('ui-state-hover');
            },
            function () {
                $(this).parent().removeClass('ui-state-hover');
            })
            .click(function () {
                $(this).stop(true, true).effect("highlight");
            });

        // Widget ----------------------------------------------------------------

        $('#rib_wid_del').button({icons: {primary: 'ui-icon-trash', secondary: null}, text: false}).click(function () {
            that.delWidgets();
        });

        $('#rib_wid_doc').button({icons: {primary: 'ui-icon-info', secondary: null}, text: false}).click(function () {
            if (that.activeWidgets[0]) {
                var tpl = that.views[that.activeView].widgets[that.activeWidgets[0]].tpl;
                var widgetSet = $('#' + tpl).attr('data-vis-set');
                var docUrl = 'widgets/' + widgetSet + '/doc.html#' + tpl;
                window.open(docUrl, 'WidgetDoc', 'height=640,width=500,menubar=no,resizable=yes,scrollbars=yes,status=yes,toolbar=no,location=no');
            }
        });

        // Copy Widget to -----------------
        $('#rib_wid_copy').button({icons: {primary: 'ui-icon-copy', secondary: null}, text: false}).click(function () {
            $('#rib_wid').hide();
            $('#rib_wid_copy_tr').show();
        });
        $("#rib_wid_copy_cancel").button({icons: {primary: 'ui-icon-cancel', secondary: null}, text: false}).click(function () {
            $('#rib_wid').show();
            $('#rib_wid_copy_tr').hide();
        });

        $("#rib_wid_copy_ok").button({icons: {primary: 'ui-icon-check', secondary: null}, text: false}).click(function () {
            that.dupWidgets();
            $('#rib_wid').show();
            $('#rib_wid_copy_tr').hide();
        });

        // All Widget ---------------------
        $("#wid_all_lock_function").button({icons: {primary: 'ui-icon-locked', secondary: null}, text: false}).click(function () {
            if ($('#wid_all_lock_f').hasClass("ui-state-active")) {
                $("#vis_container").find(".vis-widget").addClass("vis-widget-lock")
            } else {
                $("#vis_container").find(".vis-widget").removeClass("vis-widget-lock")
            }
            $('#wid_all_lock_f').removeClass("ui-state-focus")
        });

        $("#wid_all_lock_drag").button({icons: {primary: 'ui-icon-extlink', secondary: null}, text: false}).click(function () {
            $('#wid_all_lock_d').removeClass("ui-state-focus");
            that.inspectWidgets([]);
        });

        // View ----------------------------------------------------------------

        // Add View -----------------
        $('#rib_view_add').button({icons: {primary: 'ui-icon-plusthick', secondary: null}, text: false}).click(function () {
            $('#rib_view').hide();
            $('#rib_view_add_tr').show();
            $('#rib_view_addname').val('').focus();
        });
        $("#rib_view_add_cancel").button({icons: {primary: 'ui-icon-cancel', secondary: null}, text: false}).click(function () {
            $('#rib_view').show();
            $('#rib_view_add_tr').hide();
        });
        $('#rib_view_addname').keyup(function (e) {
            // On enter
            if (e.which === 13) $("#rib_view_add_ok").trigger('click');
            // esc
            if (e.which === 27) $("#rib_view_add_cancel").trigger('click');
        });

        $("#rib_view_add_ok").button({icons: {primary: 'ui-icon-check', secondary: null}, text: false}).click(function () {
            var name = that.checkNewViewName();
            if (name === false) {
                return;
            } else {
                setTimeout(function(){
                    that.addView(name);
                    $('#rib_view').show();
                    $('#rib_view_add_tr').hide();
                },0)
            }
        });

        // Delete View -----------------
        $('#rib_view_del').button({icons: {primary: 'ui-icon-trash', secondary: null}, text: false}).click(function () {
            that.delView(that.activeView);
        });
        // Rename View -----------------

        $('#rib_view_rename').button({icons: {primary: 'ui-icon-pencil', secondary: null}, text: false}).click(function () {
            $('#rib_view').hide();
            $('#rib_view_rename_tr').show();
            $('#rib_view_newname').val(that.activeView).focus()
        });
        $("#rib_view_rename_cancel").button({icons: {primary: 'ui-icon-cancel', secondary: null}, text: false}).click(function () {
            $('#rib_view').show();
            $('#rib_view_rename_tr').hide();
        });
        $('#rib_view_newname').keyup(function (e) {
            // On enter
            if (e.which === 13) $("#rib_view_rename_ok").trigger('click');
            // esc
            if (e.which === 27) $("#rib_view_rename_cancel").trigger('click');
        });
        $("#rib_view_rename_ok").button({icons: {primary: 'ui-icon-check', secondary: null}, text: false}).click(function () {
            var name = that.checkNewViewName($('#rib_view_newname').val().trim());
            if (name === false) return;
            that.renameView(that.activeView, name);
            $('#rib_view').show();
            $('#rib_view_rename_tr').hide();
        });

        // Copy View -----------------
        $('#rib_view_copy').button({icons: {primary: 'ui-icon-copy', secondary: null}, text: false}).click(function () {
            $('#rib_view').hide();
            $('#rib_view_copy_tr').show();
            $('#rib_view_copyname').val(that.activeView + "_new").focus();
        });
        $("#rib_view_copy_cancel").button({icons: {primary: 'ui-icon-cancel', secondary: null}, text: false}).click(function () {
            $('#rib_view').show();
            $('#rib_view_copy_tr').hide();
        });
        $('#rib_view_copyname').keyup(function (e) {
            // On enter
            if (e.which === 13) $("#rib_view_copy_ok").trigger('click');
            // esc
            if (e.which === 27) $("#rib_view_copy_cancel").trigger('click');
        });
        $("#rib_view_copy_ok").button({icons: {primary: 'ui-icon-check', secondary: null}, text: false}).click(function () {
            var name = that.checkNewViewName($('#rib_view_copyname').val().trim());
            if (name === false) return;
            that.dupView(that.activeView, name);
            $('#rib_view').show();
            $('#rib_view_copy_tr').hide();
        });


        // Tools ----------------------------------------------------------------
        // Resolutuion -----------------

        $(".rib_tool_resolution_toggel").click(function(){
            $("#rib_tools_resolution_fix").toggle();
            $("#rib_tools_resolution_manuel").toggle();
        })

        $('#saving_progress').button({
            text:  false,
            icons: {primary: 'ui-icon-disk'}
        }).click(that._saveToServer).hide().addClass('ui-state-active');

        $('#exit_button').button({
            text:  false,
            icons: {primary: 'ui-icon-close'}
        }).click(function () {
            that.saveRemote(function () {
                // Show hint how to get back to edit mode
                if (typeof storage !== 'undefined') {
                    if (!storage.get("isEditHintShown")) {
                        that.showMessage(_('To get back to edit mode just call "%s" in browser', location.href));
                        storage.set('isEditHintShown', true);
                    }
                }

                // Some systems (e.g. offline mode) show here the content of directory if called without index.html
                location.href = 'index.html' + window.location.search + '#' + that.activeView;
            });
        });
    },
    editInitWidgetPreview: function () {
        $('#btn_prev_zoom').hover(
            function () {
                $(this).addClass('ui-state-hover');
            },
            function () {
                $(this).removeClass('ui-state-hover');
            }
        ).click(function () {
                if ($(this).hasClass("ui-state-active")) {
                    $(this).removeClass("ui-state-active");
                    $(".wid_prev").removeClass("wid_prev_k")
                    $(".wid_prev_content").css("zoom", 1)
                } else {
                    $(this).addClass("ui-state-active");
                    $(".wid_prev").addClass("wid_prev_k")
                    $(".wid_prev_content").css("zoom", 0.5)
                }
            })

        $('#btn_prev_type').hover(
            function () {
                $(this).addClass('ui-state-hover');
            },
            function () {
                $(this).removeClass('ui-state-hover');
            }
        ).click(function () {
                if ($(this).hasClass("ui-state-active")) {
                    $(this).removeClass("ui-state-active");
                    $(".wid_prev_type").hide()
                } else {
                    $(this).addClass("ui-state-active");
                    $(".wid_prev_type").show()
                }
            })

        $.each(vis.widgetSets, function () {
            var set = "";
            if (this.name) {
                set = this.name
            } else {
                set = this;
            }
            var tpl_list = $('.vis-tpl[data-vis-set="' + set + '"]');

            $.each(tpl_list, function (i) {
                var tpl = $(tpl_list[i]).attr('id');
                var type = "";
                if ($("#" + tpl).data('vis-type')) {
                    type = '<div class="wid_prev_type">' + $("#" + tpl).data("vis-type") + '</div>'
                }
                $('#toolbox').append('<div id="prev_container_' + tpl + '" class="wid_prev ' + set + '_prev " data-tpl="' + tpl + '">' + type + '<div>' + $("#" + tpl).data('vis-name') + '</div></div>');
                if ($(tpl_list[i]).data('vis-prev')) {

                    var content = $('#prev_container_' + tpl).append($(tpl_list[i]).data('vis-prev'));
                    $(content).children().last().addClass("wid_prev_content")
                }


                $('#prev_container_' + tpl).draggable({
                    helper:      'clone',
                    appendTo:    $('#panel_body'),
                    containment: $('#panel_body'),
                    zIndex:      10000,
                    cursorAt:    {top: 0, left: 0},

                    start: function (event, ui) {
                        if (ui.helper.children().length < 3) {
                            $(ui.helper).addClass("ui-state-highlight ui-corner-all").css({padding: "2px", "font-size": "12px"})

                        } else {
                            ui.helper.children()[0].remove();
                            ui.helper.children()[0].remove();
                            //$(ui.helper.children()[0]).css("border","none")
                            $(ui.helper).css("border", "none")
                            $(ui.helper).css("width","auto")
                        }

                    }
                });
            });
        });
    },
    editInitSelectView: function () {
        var that = this;
        $('#view_select_tabs_wrap').resize(function () {
            var o = {
                parent_w: $('#view_select_tabs_wrap').width(),
                self_w:   $('#view_select_tabs').width(),
                self_l:   parseInt($('#view_select_tabs').css('left'))
            };
            if (o.parent_w >= (o.self_w + o.self_l)){
                $('#view_select_tabs').css('left', (o.parent_w - o.self_w) + "px");
            }
        });

        $('#view_select_left').button({
            icons: {
                primary: "ui-icon-carat-1-w"
            },
            text: false
        }).click(function () {
            var o = {
                parent_w: $('#view_select_tabs_wrap').width(),
                self_w:   $('#view_select_tabs').width(),
                self_l:   parseInt($('#view_select_tabs').css('left'))
            };

            if (o.self_w != o.parent_w) {
                if ((o.parent_w - o.self_w) <= (o.self_l - 50)) {
                    $('#view_select_tabs').css('left', o.self_l - 50 + "px")
                } else {
                    $('#view_select_tabs').css('left', (o.parent_w - o.self_w) + "px")
                }
            }
        });

        $('#view_select_right').button({
            icons: {
                primary: "ui-icon-carat-1-e"
            },
            text: false
        }).click(function () {
            var o = {
                parent_w: $('#view_select_tabs_wrap').width(),
                self_w: $('#view_select_tabs').width(),
                self_l: parseInt($('#view_select_tabs').css('left'))
            };

            if (o.self_w != o.parent_w) {
                if ((o.self_l + 50) <= 0) {
                    $('#view_select_tabs').css('left', o.self_l + 50 + "px")
                } else {
                    $('#view_select_tabs').css('left', "0px")
                }
            }
        });

        $('#view_select').bind('mousewheel DOMMouseScroll', function (event) {
            var o = {
                parent_w: $('#view_select_tabs_wrap').width(),
                self_w: $('#view_select_tabs').width(),
                self_l: parseInt($('#view_select_tabs').css('left'))
            }
            if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {

                if (o.self_w != o.parent_w) {
                    if ((o.parent_w - o.self_w) <= (o.self_l - 20)) {
                        $('#view_select_tabs').css('left', o.self_l - 20 + "px")
                    } else {
                        $('#view_select_tabs').css('left', (o.parent_w - o.self_w) + "px")
                    }
                }
            }
            else {
                if (o.self_w != o.parent_w) {
                    if ((o.self_l + 20) <= 0) {
                        $('#view_select_tabs').css('left', o.self_l + 20 + "px")
                    } else {
                        $('#view_select_tabs').css('left', "0px")
                    }
                }
            }
        });


        var sel;

        var keys = Object.keys(vis.views);
        var len = keys.length;
        var i;
        var k;

        keys.sort();

        $('#view_select_tabs').on('click', ".view-select-tab", function () {
            var view = $(this).attr('id').replace('view_tab_', "");
            $('.view-select-tab').removeClass('ui-tabs-active ui-state-active');
            $(this).addClass('ui-tabs-active ui-state-active');
            that.changeView(view);
        });


        for (i = 0; i < len; i++) {
            k = keys[i];

            if (k == this.activeView) {

                sel = " selected";
            } else {
                sel = '';
            }
            $('#view_select_tabs').append('<div id="view_tab_' + k + '" class="view-select-tab ui-state-default ui-corner-top sel_opt_'+k+'">' + k + '</div>');
        }

        $('#view_tab_' + this.activeView).addClass('ui-tabs-active ui-state-active')
    },
    editInitNext: function () {
        // ioBroker.vis Editor Init
        var that = this;

        this.editInitSelectView();
        // todo Remove the old select view
        var sel;

        var keys = Object.keys(this.views);
        var len = keys.length;
        var i;
        var k;

        keys.sort();

        for (i = 0; i < len; i++) {
            k = '<option value="' + keys[i] + '">' + keys[i] + '</option>';
            this.$selectView.append(k);
            this.$copyWidgetSelectView.append(k);
        }
        this.$selectView.val(this.activeView);
        this.$selectView.selectmenu({
            change: function( event, ui ) {
                that.changeView($(this).val());
            }
        });
        this.$copyWidgetSelectView.val(this.activeView);
        this.$copyWidgetSelectView.selectmenu();
        $('#inspect_view_theme').selectmenu({width: '100%'});

        // end old select View xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


        var $select_set = $('#select_set');
        //$select_set.html('');
        $select_set.append('<option value="all">*</option>');
        for (i = 0; i < this.widgetSets.length; i++) {
            if (this.widgetSets[i].name !== undefined) {
                $select_set.append('<option value="' + this.widgetSets[i].name + '">' + this.widgetSets[i].name + '</option>');
            } else {
                $select_set.append('<option value="' + this.widgetSets[i] + '">' + this.widgetSets[i] + '</option>');
            }
        }

        var last_set = storage.get('vis.Last_Widgetset');

        $('#select_set option[value="' + last_set + '"]').prop('selected', true);

        this.editInitWidgetPreview();

        $select_set.selectmenu({
            change: function (event, ui) {

                var tpl = ui.item.value;

                storage.set('vis.Last_Widgetset', tpl);
                if (tpl == "all") {
                    $('.wid_prev').show()
                } else {
                    $('.wid_prev').hide();
                    $('.' + tpl + '_prev').show();
                }
            }
        });

        if (last_set != "all" && last_set ) {
            $('.wid_prev').hide();
            $('.' + last_set + '_prev').show();
        }

        // Expand/Collapse view settings
        $('.view-group').each(function () {
            $(this).button({
                icons: {
                    primary: "ui-icon-triangle-1-s"
                },
                text: false
            }).css({width: 22, height: 22}).click(function () {
                var group = $(this).attr('data-group');
                that.groupsState[group] = !that.groupsState[group];
                $(this).button('option', {
                    icons: {primary: that.groupsState[group] ? "ui-icon-triangle-1-n" : "ui-icon-triangle-1-s"}
                });
                if (that.groupsState[group]) {
                    $('.group-' + group).show();
                } else {
                    $('.group-' + group).hide();
                }
                if (typeof storage != 'undefined') {
                    storage.set('groups', JSON.stringify(that.groupsState));
                }
            });
            var group = $(this).attr('data-group');
            if (that.groupsState && !that.groupsState[group]) $('.group-' + group).hide();
        });

        // Init inspect view settings buttons
        $('.view-edit-button').each(function () {
            var type = $(this).attr('data-type');
            if (type == 'color') {
                if ((typeof colorSelect != 'undefined' && $().farbtastic)) {
                    $(this).button({
                        text: false,
                        icons: {
                            primary: 'ui-icon-note'
                        }
                    }).click(function () {
                        var attr = $(this).attr('data-attr');
                        var _settings = {
                            current: $('#inspect_' + attr).val(),
                            onselectArg: attr,
                            onselect: function (img, _data) {
                                $('#inspect_' + _data).val(colorSelect.GetColor()).trigger('change');
                            }
                        };
                        colorSelect.show(_settings);
                    }).css({width: 22, height: 22}).attr('title',_('Select color'));
                }

            }
        });

        // Create background_class property if does not exist
        if (this.views[this.activeView] != undefined) {
            if (this.views[vis.activeView].settings == undefined) {
                this.views[vis.activeView].settings = {};
            }
            if (this.views[vis.activeView].settings.style == undefined) {
                this.views[vis.activeView].settings.style = {};
            }
            if (this.views[vis.activeView].settings.style['background_class'] == undefined) {
                this.views[vis.activeView].settings.style['background_class'] = '';
            }
        }

        if (this.fillWizard) this.fillWizard();

        // Deselect active widget if click nowhere. Not required if selectable is active
        if (!this.selectable) {
            $('#vis_container').click(function () {
                that.inspectWidgets([]);
            });
        }

        if (this.conn.getType() == 'local') {
            $('#export_local_view').click(function () {
                that.exportView(true);
            }).show();
            $('#import_local_view').click(function () {
                $('#textarea_import_view').html('');
                $('#dialog_import_view').dialog({
                    autoOpen: true,
                    width: 800,
                    height: 600,
                    modal: true,
                    open: function (event, ui) {
                        $('[aria-describedby="dialog_import_view"]').css('z-index', 1002);
                        $('.ui-widget-overlay').css('z-index', 1001);
                        $('#start_import_view').click(function () {
                            that.importView(true);
                        });
                        $('#name_import_view').hide();
                    }
                });
            }).show();
            $('#clear_local_view').click(function () {
                if (typeof storage !== 'undefined') {
                    localStorage.clear();
                    window.location.reload();
                }
            }).show();
            $('#local_view').show();
        }

        this.showWaitScreen(false);
        $('#menu_body').show();
        $('#panel_body').show();
        $('head').prepend('<style id="scrollbar_style">html{}::-webkit-scrollbar-thumb {background-color: '+$(".ui-widget-header ").first().css("background-color")+'}</style>');

    },
    editLoadConfig: function () {
        // Read all positions, selected widgets for every view,
        // Selected view, selected menu page,
        // Selected widget or view page
        // Selected filter
        if (typeof storage != 'undefined') {
            this.config = storage.get('visConfig') || {};
        }
    },
    showMessage: function (message, title, icon) {
        if (!this.$dialogMessage) {
            this.$dialogMessage = $('#dialog-message');
            this.$dialogMessage.dialog({
                autoOpen: false,
                modal:    true,
                buttons: [
                    {
                        text: _('Ok'),
                        click: function () {
                            $(this).dialog('close');
                        }
                    }
                ]
            });
        }
        this.$dialogMessage.dialog('option', 'title', title || _('Message'));
        $('#dialog-message-text').html(message);
        if (icon) {
            $('#dialog-message-icon').show();
            $('#dialog-message-icon').attr('class', '');
            $('#dialog-message-icon').addClass('ui-icon ui-icon-' + icon);
        } else {
            $('#dialog-message-icon').hide();
        }
        this.$dialogMessage.dialog('open');
    },
    confirmMessage: function (message, title, icon, callback) {
        if (!this.$dialogConfirm) {
            this.$dialogConfirm = $('#dialog-confirm');
            this.$dialogConfirm.dialog({
                autoOpen: false,
                modal:    true,
                buttons: [
                    {
                        text: _('Ok'),
                        click: function () {
                            var cb = $(this).data('callback');
                            $(this).dialog('close');
                            if (cb) cb(true);
                        }
                    },
                    {
                        text: _('Cancel'),
                        click: function () {
                            var cb = $(this).data('callback');
                            $(this).dialog('close');
                            if (cb) cb(false);
                        }
                    }

                ]
            });
        }
        this.$dialogConfirm.dialog('option', 'title', title || _('Confirm'));
        $('#dialog-confirm-text').html(message);
        if (icon) {
            $('#dialog-confirm-icon').show();
            $('#dialog-confirm-icon').attr('class', '');
            $('#dialog-confirm-icon').addClass('ui-icon ui-icon-' + icon);
        } else {
            $('#dialog-confirm-icon').hide();
        }
        this.$dialogConfirm.data('callback', callback);
        this.$dialogConfirm.dialog('open');
    },

    addView: function (view) {
        if (this[view]) return false;

        this.views[view] = {settings: {style: {}}, widgets: {}};
        var that = this;
        this.saveRemote(function () {
            //$(window).off('hashchange');
            //window.location.hash = "#" + view;

            $('#view_tab_' + that.activeView).removeClass('ui-tabs-active ui-state-active');
            that.changeView(view);

            $('#view_select_tabs').append('<div id="view_tab_' + view + '" class="view-select-tab ui-state-default ui-corner-top sel_opt_'+view+'">' + view + '</div>');
            $('#view_tab_' + that.activeView).addClass('ui-tabs-active ui-state-active');

            that.$selectView.append('<option value="' + view + '">' + view + '</option>');
            that.$selectView.val(view);
            that.$selectView.selectmenu('refresh');

            that.$copyWidgetSelectView.append('<option value="' + view + '">'+ view + '</option>');
            that.$copyWidgetSelectView.val(view);
            that.$copyWidgetSelectView.selectmenu('refresh');
        });
    },
    renameView: function (oldName, newName) {
        this.views[newName] = $.extend(true, {}, this.views[oldName]);
        $('#vis_container').hide();
        delete this.views[oldName];
        this.activeView = newName;
        this.renderView(newName);
        this.changeView(newName);

        // Rebuild tabs, select, selectCopyTo
        $('#view_tab_' + oldName).attr('id', 'view_tab_' + newName);
        $('#view_tab_' + newName).removeClass('sel_opt_' + oldName).addClass('ui-tabs-active ui-state-active sel_opt_' + newName).html(newName);
        var $opt = this.$selectView.find('option[value="' + oldName + '"]');
        $opt.html(newName).attr('value', newName);
        this.$selectView.val(newName);
        this.$selectView.selectmenu('refresh');

        $opt = this.$copyWidgetSelectView.find('option[value="' + oldName + '"]');
        $opt.html(newName).attr('value', newName);
        this.$copyWidgetSelectView.val(newName);
        this.$copyWidgetSelectView.selectmenu('refresh');

        this.saveRemote(function () {

        });
    },
    delView: function (view) {
        var that = this;
        this.confirmMessage(_('Really delete view %s?', view), null, 'help', function (result) {
            if (result) {
                if (view == that.activeView) that.nextView();

                if (that.views[view]) delete that.views[view];
                that.saveRemote(function () {
                    $('#view_tab_' + view).remove();
                    $('#visview_' + view).remove();

                    that.$selectView.find('option[value="' + view + '"]').remove();
                    that.$copyWidgetSelectView.find('option[value="' + view + '"]').remove();
                    if (!that.$selectView.find('option').length) {
                        that.$selectView.append('<option value="">' + _('none') + '</option>');
                        that.$copyWidgetSelectView.append('<option value="">' + _('none') + '</option>');
                        that.$selectView.val('');
                        that.$copyWidgetSelectView.val('');
                    }

                    that.$selectView.selectmenu('refresh');
                    that.$copyWidgetSelectView.selectmenu('refresh');
                });
            }
        });
    },
    dupView: function (source, dest) {
        this.views[dest] = $.extend(true, {}, this.views[source]);

        // Give to all widgets new IDs...
        for (var widget in this.views[dest].widgets) {
            this.views[dest].widgets[this.nextWidget()] = this.views[dest].widgets[widget];
            delete this.views[dest].widgets[widget];
        }
        var that = this;
        this.saveRemote(function () {
            that.renderView(dest);
            that.changeView(dest);
            $('.view-select-tab').removeClass('ui-tabs-active ui-state-active');

            $('#view_select_tabs').append('<div id="view_tab_' + dest + '" class="view-select-tab ui-state-default ui-corner-top sel_opt_' + dest + '">' + dest + '</div>');
            $('#view_tab_' + dest).addClass('ui-tabs-active ui-state-active');

            that.$selectView.append('<option value="' + dest + '">' + dest + '</option>');
            that.$selectView.val(dest);
            that.$selectView.selectmenu('refresh');

            that.$copyWidgetSelectView.append('<option value="' + dest + '">'+ dest + '</option>');
            that.$copyWidgetSelectView.val(dest);
            that.$copyWidgetSelectView.selectmenu('refresh');

        });
    },
    nextView: function () {
        var $next = $('.view-select-tab.ui-state-active').next();

        if ($next.hasClass('view-select-tab')) {
            $next.trigger('click');
        } else {
            $('.view-select-tab.ui-state-active').parent().children().first().trigger('click');
        }
    },
    prevView: function () {
        var $prev = $('.view-select-tab.ui-state-active').prev();

        if ($prev.hasClass('view-select-tab')) {
            $prev.trigger('click');
        } else {
            $('.view-select-tab.ui-state-active').parent().children().last().trigger('click');
        }
    },
    exportView: function (isAll) {
        var exportView = $.extend(true, {}, isAll ? vis.views : vis.views[vis.activeView]);
        // Allen Widgets eine neue ID verpassen...
        var num = 1;
        var wid;
        if (!isAll) {
            for (var widget in exportView.widgets) {
                wid = "e" + (('0000' + num).slice(-5));
                num += 1;
                exportView.widgets[wid] = exportView.widgets[widget];
                delete exportView.widgets[widget];
            }
        }
        $('#textarea_export_view').html(JSON.stringify(exportView, null, "  "));
        $('#dialog_export_view').dialog({
            autoOpen: true,
            width: 800,
            height: 600,
            modal: true,
            open: function (/*event, ui*/) {
                $('[aria-describedby="dialog_export_view"]').css('z-index', 1002);
                $('.ui-widget-overlay').css('z-index', 1001);
            }
        });
    },
    importView: function (isAll) {
        var name = vis.checkNewViewName($('#name_import_view').val());
        var importObject;
        if (name === false) return;
        try {
            var text = $('#textarea_import_view').val();
            importObject = JSON.parse(text);
        } catch (e) {
            alert(_('invalid JSON') + "\n\n" + e);
            return;
        }
        if (isAll) {
            vis.views = importObject;
            vis.saveRemote(function () {
                window.location.reload();
            });
        } else {
            vis.views[name] = importObject;

            // Allen Widgets eine neue ID verpassen...
            for (var widget in vis.views[name].widgets) {
                vis.views[name].widgets[vis.nextWidget()] = vis.views[name].widgets[widget];
                delete vis.views[name].widgets[widget];
            }
            vis.saveRemote(function () {
                vis.renderView(name);
                vis.changeView(name);
                window.location.reload();
            });
        }
    },
    checkNewViewName: function (name) {
        if (name == '') {
            this.showMessage(_('Please enter the name for the new view!'));
            return false;
        } else if (this.views[name]) {
            this.showMessage(_('The view with the same name yet exists!'));
            return false;
        } else {
            return name;
        }
    },

    nextWidget: function () {
        var next = 1;
        var used = [];
        var key = "w" + (('000000' + next).slice(-5));
        for (var view in vis.views) {
            for (var wid in vis.views[view].widgets) {
                wid = wid.split('_');
                wid = wid[0];
                used.push(wid);
            }
            while (used.indexOf(key) > -1) {
                next += 1;
                key = "w" + (('000000' + next).slice(-5));
            }
        }
        return key;
    },
    getViewOfWidget: function (id) {
        // find view of this widget
        var view = null;
        for (var v in vis.views) {
            if (vis.views[v] && vis.views[v].widgets && vis.views[v].widgets[id]) {
                view = v;
                break;
            }
        }
        return view;
    },
    getViewsOfWidget: function (id) {
        if (id.indexOf('_') == -1) {
            var view = this.getViewOfWidget(id);
            if (view) {
                return [view];
            } else {
                return [];
            }
        } else {
            var wids = id.split('_', 2);
            var wid = wids[0];
            var result = [];
            for (var v in this.views) {
                if (this.views[v].widgets[wid + '_' + v] !== undefined) {
                    result[result.length] = v;
                }
            }
            return result;
        }
    },
    delWidgetHelper: function (id, isAll) {
        if (!id) return;

        if (isAll && id.indexOf('_') != -1) {
            var views = this.getViewsOfWidget(id);
            var wids = id.split('_', 2);
            for (var i = 0; i < views.length; i++) {
                this.delWidgetHelper(wids[0] + '_' + views[i], false);
            }
            this.inspectWidgets([]);
            return;
        }

        // Remove widget from the list
        this.$selectActiveWidgets.find('option[value="' + id + '"]').remove();
        this.$selectActiveWidgets.multiselect('refresh');

        var view = this.getViewOfWidget(id);

        var widget_div = document.getElementById(id);
        if (widget_div && widget_div.visCustomEdit && widget_div.visCustomEdit['delete']) {
            widget_div.visCustomEdit['delete'](id);
        }

        if (widget_div && widget_div._customHandlers && widget_div._customHandlers.onDelete) {
            widget_div._customHandlers.onDelete(widget_div, id);
        }

        $('#' + id).remove();
        if (view) delete this.views[view].widgets[id];

        if (this.widgets[id]) {
            delete this.widgets[id];

            /*var widgets = [];
            // Delete old from array
            for (var w in this.widgets) {
                if (w != id) widgets[w] = this.widgets[w];
            }
            this.widgets = widgets;*/
        }
        var pos = this.activeWidgets.indexOf(id);
        if (pos != -1) this.activeWidgets.splice(pos, 1);
    },
    delWidgets: function (widgets, noSave) {
        if (typeof widgets != 'object') widgets = null;

        if (!widgets){
            // Store array, because it will be modified in delWidgetHelper
            widgets = [];
            for (var i = 0; i < this.activeWidgets.length; i++) {
                widgets.push(this.activeWidgets[i]);
            }
        }

        for (var i = 0; i < widgets.length; i++) {
            this.delWidgetHelper(widgets[i], true);
        }
        if (!noSave) this.save();

        this.inspectWidgets();
    },
    bindWidgetClick: function (id) {
        var that = this;
        $('#' + id).click(function (e) {
            if (that.dragging) return;

            var widgetId   = $(this).attr('id');
            // if shift or control pressed
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                var pos = that.activeWidgets.indexOf(widgetId);

                // Add to list
                if (pos == -1) {
                    that.inspectWidgets(widgetId);
                } else {
                    // Remove from list
                    that.inspectWidgets(null, widgetId);
                }
            } else {
                // Simple click on some widget
                if (that.activeWidgets.length != 1 || that.activeWidgets[0] != widgetId) {
                    that.inspectWidgets([widgetId]);
                }
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    },
    addWidget: function (tpl, data, style, wid, view, hidden, noSave) {
        if (!view) view = this.activeView;

        var isSelectWidget = (wid === undefined);
        var isViewExist = (document.getElementById('visview_' + view) != null);
        var renderVisible = data.renderVisible;

        if (renderVisible) delete data.renderVisible;

        if (isSelectWidget && !isViewExist) {
            this.renderView(view, true, false);
            isViewExist = true;
        }

        var widgetId = wid || this.nextWidget();

        this.widgets[widgetId] = {
            wid: widgetId,
            data: new can.Map($.extend({
                'wid': widgetId
            }, data))
        };

        if (renderVisible) this.widgets[widgetId].renderVisible = true;

        this.views[view].widgets = this.views[view].widgets || {};
        this.views[view].widgets[widgetId] = this.views[view].widgets[widgetId] || {};

        if (isViewExist) {
            $('#visview_' + view).append(can.view(tpl, {
                hm:   this.states[this.widgets[widgetId].data.oid + '.val'],
                ts:   this.states[this.widgets[widgetId].data.oid + '.ts'],
                ack:  this.states[this.widgets[widgetId].data.oid + '.ack'],
                lc:   this.states[this.widgets[widgetId].data.oid + '.lc'],
                data: this.widgets[widgetId]['data'],
                view: view
            }));
        }

        var $jWidget = $('#' + widgetId);
        style = style || this.findFreePosition(view, widgetId, null, $jWidget.width(), $jWidget.height());

        if (this.views[view].widgets[widgetId].data !== undefined) {
            data = $.extend(data, this.views[view].widgets[widgetId].data, true);
        }

        this.views[view].widgets[widgetId] = {
            tpl:       tpl,
            data:      data,
            style:     style,
            widgetSet: $('#' + tpl).attr('data-vis-set')
        };

        if (renderVisible) this.views[view].widgets[widgetId].renderVisible = true;

        if (style) $jWidget.css(style);

        if (isSelectWidget && this.binds.jqueryui) this.binds.jqueryui._disable();

        if (isSelectWidget) {
            this.activeWidgets = [widgetId];
            this.actionHighlighWidget(widgetId);
        }

        if (!noSave) this.save();

        this.bindWidgetClick(widgetId);

        return widgetId;
    },
    dupWidgets: function (widgets, targetView) {
        if (!widgets)    widgets = this.activeWidgets;
        if (!targetView) targetView = this.activeView;

        var activeView;
        var targetView;
        var tpl;
        var data;
        var style;
        var newWidgets = [];

        for (var i = 0; i < widgets.length; i++) {
            // if from clipboard
            if (widgets[i].widget) {
                var objWidget   = widgets[i].widget;
                activeView      = widgets[i].view;
                tpl             = objWidget.tpl;
                data            = objWidget.data;
                style           = objWidget.style;
                widgets[i].view = this.activeView;
            } else {
                // From active view
                activeView = this.activeView;
                tpl        = this.views[this.activeView].widgets[widgets[i]].tpl;
                data       = $.extend({}, this.views[this.activeView].widgets[widgets[i]].data);
                style      = $.extend({}, this.views[this.activeView].widgets[widgets[i]].style);
            }

            if (activeView == targetView) {
                style.top  = parseInt(style.top, 10);
                style.left = parseInt(style.left, 10);

                style.top  += 10;
                style.left += 10;
                // Store new settings
                if (widgets[i].widget) {
                    // If after copy to clipboard, the copied widget was changed, so the new modified version will be pasted and not the original one.
                    // So use JSON.
                    widgets[i].widget = $.extend(true, {}, objWidget);
                }

                // addWidget Params: tpl, data, style, wid, view, hidden, noSave
                newWidgets.push(this.addWidget(tpl, data, style, undefined, undefined, undefined, true));

                this.$selectActiveWidgets
                    .append('<option value="' + newWidgets[newWidgets.length - 1] + '">' + newWidgets[newWidgets.length - 1] + ' (' + $("#" + vis.views[vis.activeView].widgets[newWidgets[newWidgets.length - 1]].tpl).attr("data-vis-name") + ')</option>')
                    .multiselect('refresh');
            } else {
                if ($('#vis_container').find('#visview_' + targetView).html() == undefined) {
                    this.renderView(targetView, true, true);
                }
                newWidgets.push(this.addWidget(tpl, data, style, this.nextWidget(), targetView, true));
            }
        }
        if (!widgets[0].widget) {
            this.showHint(_('Widget(s) copied to view %s', targetView) + '.', 30000);
        } else {
            this.activeWidgets = newWidgets;
        }

        var that = this;
        setTimeout(function () {
            that.inspectWidgets();
            that.save();
        }, 50);
    },
    renameWidget: function (oldId, newId) {
        // find view of this widget
        var view = this.getViewOfWidget(oldId);

        // create new widget with the same properties
        if (view) {
            var widgetData = this.views[view].widgets[oldId];
            this.addWidget(widgetData.tpl, widgetData.data, widgetData.style, newId, view);
            this.$selectActiveWidgets
                .append('<option value=' + newId + '">' + this.getWidgetName(view, newId) + '</option>')
                .multiselect('refresh');

            this.delWidgetHelper(oldId, false);
        }
        this.inspectWidgets([newId]);
        this.save();
    },
    reRenderWidgetEdit: function (wid) {
        this.reRenderWidget(wid);
        if (this.activeWidgets.indexOf(wid) != -1) {
            var $wid = $('#' + wid);
            // User interaction
            if (!this.widgets[wid].data._no_move) this.draggable($wid);
            // If only one selected
            if (this.activeWidgets.length == 1) if (!this.widgets[wid].data._no_resize) this.resizable($wid);
        }
    },
    getObjDesc: function (id) {
        //if (this.objects[id] && this.objects[id].common && this.objects[id].common.name) {
        //    return this.objects[id].common.name;
        //}
        /*var parent = "";
         var p = this.objects[id]["Parent"];
         //console.log('parent metaObject', id, p, vis.objects[p]);
         if (p !== undefined && this.objects[p]["DPs"] !== undefined) {
         parent = this.objects[p]["Name"] + "/";
         } else if (this.objects[id]["TypeName"] !== undefined) {
         if (this.objects[id]["TypeName"] == "VARDP") {
         parent = _("Variable") + " / ";
         } else if (this.objects[id]["TypeName"] == "PROGRAM") {
         parent = _("Program") + " / ";
         }
         }

         if (this.objects[id]["Address"] !== undefined) {
         return parent + vis.objects[id]["Name"] + "/" + this.objects[id]["Address"];
         } else if (this.objects[id]["Name"]) {
         return parent + this.objects[id]["Name"];
         } else if (this.objects[id]["name"]) {
         return parent + this.objects[id]["name"];
         }
         } else if (id == 41) {
         return _("Service messages");
         } else if (id == 40) {
         return _("Alarms");
         }*/
        return id;
    },
    // find this wid in all views,
    // delete where it is no more exist,
    // create where it should exist and
    // sync data
    syncWidget: function (id, views) {
        // find view of this widget
        var view = vis.getViewOfWidget(id);

        if (views === undefined) {
            views = vis.getViewsOfWidget(id);
        }

        if (view) {
            if (views == null) {
                views = [];
            }

            var isFound = false;
            for (var i = 0; i < views.length; i++) {
                if (views[i] == view) {
                    isFound = true;
                    break;
                }
            }

            if (!isFound) {
                views[views.length] = view;
            }
            var wids = id.split('_', 2);
            var wid = wids[0];

            // First sync views
            for (var v_ in vis.views) {
                isFound = false;
                if (v_ == view) {
                    continue;
                }

                for (var j = 0; j < views.length; j++) {
                    if (views[j] == v_) {
                        isFound = true;
                        break;
                    }
                }

                if (vis.views[v_].widgets[wid + '_' + v_] !== undefined) {
                    vis.delWidgetHelper(wid + '_' + v_, false);
                }

                if (isFound) {
                    // Create
                    vis.addWidget(vis.views[view].widgets[id].tpl, vis.views[view].widgets[id].data, vis.views[view].widgets[id].style, wid + '_' + v_, v_);
                }
            }


            if (views.length < 2 && (id.indexOf('_') != -1)) {
                // rename this widget from "wid_view" to "wid"
                var wids = id.split('_', 2);
                vis.renameWidget(id, wids[0]);
            } else if (views.length > 1 && (id.indexOf('_') == -1)) {
                vis.renameWidget(id, id + '_' + view);
            }
        }
    },
    editObjectID: function (widAttr, widgetFilter) {
        var that = this;
        // Edit for Object ID
        var line = [
            {
                input: '<input type="text" id="inspect_' + widAttr + '">',
                button: {
                    icon: 'ui-icon-note',
                    text: false,
                    title: _('Select object ID'),
                    click: function () {
                        var wdata = $(this).data('data-wdata');

                        $('#dialog-select-member-' + wdata.attr).selectId('show', that.views[wdata.view].widgets[wdata.widgets[0]].data[wdata.attr], function (newId, oldId) {
                            if (oldId != newId) {
                                $('#inspect_' + wdata.attr).val(newId);
                                $('#inspect_' + wdata.attr).trigger('change');

                                /*
                                if (document.getElementById('inspect_hm_wid')) {
                                    if (that.objects[newId]['Type'] !== undefined && that.objects[value]['Parent'] !== undefined &&
                                        (that.objects[newId]['Type'] == 'STATE' ||
                                         that.objects[newId]['Type'] == 'LEVEL')) {

                                        var parent = that.objects[newId]['Parent'];
                                        if (that.objects[parent]['DPs'] !== undefined &&
                                            that.objects[parent]['DPs']['WORKING'] !== undefined) {
                                            $('#inspect_hm_wid').val(that.objects[parent]['DPs']['WORKING']);
                                            $('#inspect_hm_wid').trigger('change');
                                        }
                                    }
                                }

                                // Try to find Function of the device and fill the Filter field
                                var $filterkey = $('#inspect_filterkey');
                                if ($filterkey.length) {
                                    if ($filterkey.val() == '') {
                                        var oid = newId;
                                        var func = null;
                                        if (that.metaIndex && that.metaIndex['ENUM_FUNCTIONS']) {
                                            while (oid && that.objects[oid]) {
                                                for (var t = 0; t < that.metaIndex['ENUM_FUNCTIONS'].length; t++) {
                                                    var list = that.objects[that.metaIndex['ENUM_FUNCTIONS'][t]];
                                                    for (var z = 0; z < list['Channels'].length; z++) {
                                                        if (list['Channels'][z] == oid) {
                                                            func = list.Name;
                                                            break;
                                                        }
                                                    }
                                                    if (func) break;
                                                }
                                                if (func) break;

                                                oid = that.objects[oid]['Parent'];
                                            }
                                        }
                                        if (func) $filterkey.val(func).trigger('change');
                                    }
                                }*/
                            }
                        });
                    }
                },
                onchange: function (val) {
                    var wdata = $(this).data('data-wdata');
                    $('#inspect_' + wdata.attr + '_desc').html(that.getObjDesc(val));
                }
            },
            {
                input: '<div id="inspect_' + widAttr + '_desc"></div>'
            }
        ];

        // Init select dialog
        if (!$('#dialog-select-member-' + widAttr).length) {
            $('body').append('<div id="dialog-select-member-' + widAttr + '" style="display:none">');
            $('#dialog-select-member-' + widAttr).selectId('init', {
                texts: {
                    select: _('Select'),
                    cancel: _('Cancel'),
                    all: _('All'),
                    id: _('ID'),
                    name: _('Name'),
                    role: _('Role'),
                    room: _('Room'),
                    value: _('Value'),
                    selectid: _('Select ID'),
                    enum: _('Members'),
                    from: _('from'),
                    lc: _('lc'),
                    ts: _('ts'),
                    ack: _('ack'),
                    expand: _('expand'),
                    collapse: _('collapse'),
                    refresh: _('refresh'),
                    edit: _('edit'),
                    ok: _('ok'),
                    wait: _('wait'),
                    list: _('list'),
                    tree: _('tree')
                },
                columns: ['image', 'name', 'type', 'role', 'enum', 'room', 'value'],
                imgPath: '/lib/css/fancytree/',
                objects: this.objects,
                states: this.states,
                zindex: 1001
            });
        }

        return line;
    },
    editSelect: function (widAttr, values, notTranslate, init, onchange) {
        if (typeof notTranslate == 'function') {
            onchange = init;
            init = notTranslate;
            notTranslate = false;
        }

        // Select
        var line = {
            input: '<select type="text" id="inspect_' + widAttr + '">'
        }
        if (onchange) line.onchange = onchange;
        if (init)     line.init = init;
        if (values.length && values[0] !== undefined) {
            for (var t = 0; t < values.length; t++) {
                line.input += '<option value="' + values[t] + '">' + (notTranslate ? values[t] : _(values[t])) + '</option>';
            }
        } else {
            for (var name in values) {
                line.input += '<option value="' + values[name] + '">' + name + '</option>';
            }
        }
        line.input += '</select>';
        return line;
    },
    editFontName: function (widAttr) {
        // Select
        var values = ['', 'Arial', 'Times', 'Andale Mono', 'Comic Sans', 'Impact'];
        this.editSelect(widAttr, values);
    },
    editAutoComplete: function (widAttr, values) {
        // Effect selector
        var line = {
            input: '<input type="text" id="inspect_' + widAttr + '" class="vis-edit-textbox"/>',
            init: function (_wid_attr, data) {
                $(this).autocomplete({
                    minLength: 0,
                    source: function (request, response) {
                        var _data = $.grep(values, function (value) {
                            return value.substring(0, request.term.length).toLowerCase() == request.term.toLowerCase();
                        });

                        response(_data);
                    },
                    select: function (event, ui) {
                        $(this).val(ui.item.value);
                        $(this).trigger('change', ui.item.value);
                    }
                }).focus(function () {
                    // Show dropdown menu
                    $(this).autocomplete('search', '');
                });
            }
        };
        return line;
    },
    editColor: function (widAttr) {
        var line = {
            input: '<input type="text" id="inspect_' + widAttr + '"/>'
        };
        if ((typeof colorSelect != 'undefined' && $().farbtastic)) {
            line.button = {
                icon: 'ui-icon-note',
                text: false,
                title: _('Select color'),
                click: function (/*event*/) {
                    var wdata = $(this).data('data-wdata');
                    var _settings = {
                        current: $('#inspect_' + wdata.attr).val(),
                        onselectArg: wdata,
                        onselect: function (img, _data) {
                            $('#inspect_' + wdata.attr).val(colorSelect.GetColor()).trigger('change');
                        }
                    };

                    colorSelect.show(_settings);
                }
            };
        }
        return line;
    },
    editViewName: function (widAttr) {
        var views = [''];
        for (var v in this.views) {
            views.push(v);
        }

        return this.editSelect(widAttr, views);
    },
    editEffect: function (widAttr) {
        var that = this;
        return this.editSelect(widAttr, [
            '',
            'show',
            'blind',
            'bounce',
            'clip',
            'drop',
            'explode',
            'fade',
            'fold',
            'highlight',
            'puff',
            'pulsate',
            'scale',
            'shake',
            'size',
            'slide'
        ], null, function (data) {
            var eff = widAttr.replace('_effect', '_options');
            var $elem = $('#inspect_' + eff);
            if ($elem.length) {
                if (data == 'slide') {
                    that.hideShowAttr(eff, true);
                } else {
                    that.hideShowAttr(eff, false);
                    $('#inspect_' + eff).val('').trigger('change');
                }
            }
        });
    },
    editNumber: function (widAttr, options, onchange) {
        // options = {min: ?,max: ?,step: ?}
        // Select
        var line = {
            input: '<input id="inspect_' + widAttr + '" style="width: 100%"/>',
            init: function (w, data) {
                options = options || {};
                options.spin = function () {
                    $(this).trigger('change');
                };
                $(this).spinner(options);
                $(this).parent().css({width: '100%'});
            }
        }
        if (onchange) line.onchange = onchange;
        return line;
    },
    editUrl: function (widAttr, filter) {
        var line = {
            input: '<input type="text" id="inspect_' + widAttr + '"/>'
        };
        var that = this;

        if ($.fm) {
            line.button = {
                icon: 'ui-icon-note',
                text: false,
                title: _('Select image'),
                click: function (/*event*/) {
                    var wdata = $(this).data('data-wdata');

                    $.fm({
                        lang: that.language,
                        path: that.widgets[wdata.widgets[0]].data[wdata.attr] || '/' + that.conn.namespace + '/' + that.projectPrefix + 'img/',
                        uploadDir: '/' + that.conn.namespace + '/',
                        fileFilter: filter || ['gif', 'png', 'bmp', 'jpg', 'jpeg', 'tif', 'svg'],
                        folderFilter: false,
                        mode: 'open',
                        view: 'prev',
                        userArg: wdata,
                        conn: that.conn,
                        zindex: 1001
                    }, function (_data, userData) {
                        var src = _data.path + _data.file;
                        $('#inspect_' + wdata.attr).val(src).trigger('change');
                    });
                }
            };
        }
        return line;
    },
    editCustom: function (widAttr, options) {
        if (!options) {
            console.log('No path to custom function');
        } else {
            var funcs = options[0].split('.');
            options.unshift();
            if (funcs[0] == 'vis') funcs.unshift();
            if (funcs[0] == 'binds') funcs.unshift();
            if (funcs.length == 1) {
                if (typeof this.binds[funcs[0]] == 'function') {
                    return this.binds[funcs[0]](widAttr, options);
                } else {
                    console.log('No function: vis.binds.' +  + funcs.join('.'));
                }
            } else if (funcs.length == 2) {
                if (this.binds[funcs[0]] && typeof this.binds[funcs[0]][funcs[1]] == 'function') {
                    return this.binds[funcs[0]][funcs[1]](widAttr, options);
                } else {
                    console.log('No function: vis.binds.' + funcs.join('.'));
                }
            } else if (funcs.length == 3) {
                if (this.binds[funcs[0]] && this.binds[funcs[0]][funcs[1]] && typeof this.binds[funcs[0]][funcs[1]][funcs[2]] == 'function') {
                    return this.binds[funcs[0]][funcs[1]][funcs[2]](widAttr, options);
                } else {
                    console.log('No function: vis.binds.' + funcs.join('.'));
                }
            } else {
                if (funcs.length == 0) {
                    console.log('Function name is too short: vis.binds');
                } else {
                    console.log('Function name is too long: vis.binds.' + funcs.join('.'));
                }
            }
            return {};
        }
    },
    hideShowAttr: function (widAttr, isShow) {
        if (isShow) {
            $('#td_' + widAttr).show();
        } else {
            $('#td_' + widAttr).hide();
        }
    },
    editSlider: function (widAttr, options) {
        options.min = (options.min === undefined || options.min === null || options.min == '') ? 0 : options.min;
        options.max = (options.max === undefined || options.max === null || options.max == '') ? 0 : options.max;
        options.step = (!options.step) ? (options.max - options.min) / 100 : options.step;
        var that = this;
        var line = {
            input: '<table width="100%"><tr><td style="width:50px"><input style="width:50px" id="inspect_' + widAttr + '"/></td><td width="100%"><div id="inspect_' + widAttr + '_slider"></div></td></tr>',
            init: function (w, data) {
                options.value = (data === undefined) ? options.min : data;
                var input = this;
                options.slide = function (event, ui) {
                    $(input).val(ui.value).trigger('change');
                };
                $('#inspect_' + widAttr + '_slider').slider(options);
            },
            onchange: function (value) {
                $('#inspect_' + widAttr + '_slider').slider('value', (value === undefined) ? options.min : value);
            }
        };
        return line;
    },
    editCssCommon: function () {
        var group = 'css_common';
        var line;
        this.groups[group] = this.groups[group] || {};

        this.groups[group]['css_left']       = {input: '<input type="text" id="inspect_css_left"/>'};
        this.groups[group]['css_top']        = {input: '<input type="text" id="inspect_css_top"/>'};
        this.groups[group]['css_width']      = {input: '<input type="text" id="inspect_css_width"/>'};
        this.groups[group]['css_height']     = {input: '<input type="text" id="inspect_css_height"/>'};
        this.groups[group]['css_z-index']    = this.editNumber('css_z-index');
        this.groups[group]['css_overflow-x'] = this.editSelect('css_overflow-x', ['', 'visible', 'hidden', 'scroll', 'auto', 'initial', 'inherit'], true);
        this.groups[group]['css_overflow-y'] = this.editSelect('css_overflow-y', ['', 'visible', 'hidden', 'scroll', 'auto', 'initial', 'inherit'], true);

        for(var attr in this.groups[group]) {
            this.groups[group][attr].css = true;
            this.groups[group][attr].attrName = attr;
            this.groups[group][attr].attrIndex = '';
        }
    },
    editCssFontText: function () {
        var group = 'css_font_text';
        var line;
        this.groups[group] = this.groups[group] || {};

        this.groups[group]['css_color']          = this.editColor('css_color');
        this.groups[group]['css_text-align']     = this.editSelect('css_text-align', ['', 'left', 'right', 'center' ,'justify', 'initial', 'inherit'], true);
        this.groups[group]['css_text-shadow']    = {input: '<input type="text" id="inspect_css_text-shadow"/>'};
        this.groups[group]['css_font-family']    = {input: '<input type="text" id="inspect_css_font-family"/>'};
        this.groups[group]['css_font-style']     = this.editSelect('css_font-style', ['', 'normal', 'italic', 'oblique', 'initial', 'inherit'], true);
        this.groups[group]['css_font-variant']   = this.editSelect('css_font-variant', ['', 'normal', 'small-caps', 'initial', 'inherit'], true);
        this.groups[group]['css_font-weight']    = this.editAutoComplete('css_font-weight', ['', 'normal', 'bold', 'bolder', 'lighter', 'initial', 'inherit'], true);
        this.groups[group]['css_font-size']      = this.editAutoComplete('css_font-size', ['', 'medium', 'xx-small', 'x-small', 'small', 'large', 'x-large', 'xx-large', 'smaller', 'larger', 'initial', 'inherit'], true);
        this.groups[group]['css_line-height']    = {input: '<input type="text" id="inspect_css_line-height"/>'};
        this.groups[group]['css_letter-spacing'] = {input: '<input type="text" id="inspect_css_letter-spacing"/>'};
        this.groups[group]['css_word-spacing']   = {input: '<input type="text" id="inspect_css_word-spacing"/>'};

        for(var attr in this.groups[group]) {
            this.groups[group][attr].css = true;
            this.groups[group][attr].attrName = attr;
            this.groups[group][attr].attrIndex = '';
        }
    },
    editCssBackground: function () {
        var group = 'css_background';
        var line;
        this.groups[group] = this.groups[group] || {};

        this.groups[group]['css_background']            = {input: '<input type="text" id="inspect_css_background"/>'};
        this.groups[group]['css_background-color']      = this.editColor('css_background-color');
        this.groups[group]['css_background-image']      = {input: '<input type="text" id="inspect_background-image"/>'};
        this.groups[group]['css_background-repeat']     = this.editSelect('css_background-repeat', ['', 'repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'initial', 'inherit'], true);;
        this.groups[group]['css_background-attachment'] = this.editSelect('css_background-attachment', ['', 'scroll', 'fixed', 'local', 'initial', 'inherit'], true);
        this.groups[group]['css_background-position']   = {input: '<input type="text" id="inspect_background-position"/>'};
        this.groups[group]['css_background-size']       = {input: '<input type="text" id="inspect_background-size"/>'};
        this.groups[group]['css_background-clip']       = this.editSelect('css_background-clip', ['', 'border-box', 'padding-box', 'content-box', 'initial', 'inherit'], true);
        this.groups[group]['css_background-origin']     = this.editSelect('css_background-origin', ['', 'padding-box', 'border-box', 'content-box', 'initial', 'inherit'], true);

        for(var attr in this.groups[group]) {
            this.groups[group][attr].css = true;
            this.groups[group][attr].attrName = attr;
            this.groups[group][attr].attrIndex = '';
        }
    },
    editCssBorder: function () {
        var group = 'css_border';
        var line;
        this.groups[group] = this.groups[group] || {};

        this.groups[group]['css_border-width']      = {input: '<input type="text" id="inspect_css_border-width"/>'};
        this.groups[group]['css_border-style']      = this.editAutoComplete('css_border-style', ['', 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit'], true);
        this.groups[group]['css_border-color']      = this.editColor('css_border-color');
        this.groups[group]['css_border-radius']     = {input: '<input type="text" id="inspect_css_border-radius"/>'};

        for(var attr in this.groups[group]) {
            this.groups[group][attr].css = true;
            this.groups[group][attr].attrName = attr;
            this.groups[group][attr].attrIndex = '';
        }
    },
    editCssShadowPadding: function () {
        var group = 'css_shadow_padding';
        var line;
        this.groups[group] = this.groups[group] || {};

        this.groups[group]['css_padding']        = {input: '<input type="text" id="inspect_css_padding"/>'};
        this.groups[group]['css_padding-left']   = {input: '<input type="text" id="inspect_css_padding-left"/>'};
        this.groups[group]['css_padding-top']    = {input: '<input type="text" id="inspect_css_padding-top"/>'};
        this.groups[group]['css_padding-right']  = {input: '<input type="text" id="inspect_css_padding-right"/>'};
        this.groups[group]['css_padding-bottom'] = {input: '<input type="text" id="inspect_css_padding-bottom"/>'};
        this.groups[group]['css_box-shadow']     = {input: '<input type="text" id="inspect_css_box-shadow"/>'};

        for(var attr in this.groups[group]) {
            this.groups[group][attr].css = true;
            this.groups[group][attr].attrName = attr;
            this.groups[group][attr].attrIndex = '';
        }
    },
    addToInspect: function (widgets, widAttr, group, options, onchange) {
        if (typeof widAttr != 'object') {
            widAttr = {name: widAttr};
        }
        if (widAttr.clearName === undefined) widAttr.clearName = widAttr.name;
        if (widAttr.index     === undefined) widAttr.index     = '';

        if (typeof group   == 'function') {
            onchange = group;
            group = null;
        }
        if (typeof options == 'function') {
            onchange = options;
            options = null;
        }

        options = options || {};

        var input;
        var line;
        // set default value if attr is empty
        if (widAttr.default !== undefined) {
            for (var i = 0; i < widgets.length; i++) {
                var view         = this.getViewOfWidget(widgets[i]);
                var widgetData   = this.views[view].widgets[widgets[i]].data;

                if (widgetData[widAttr.name] === null || widgetData[widAttr.name] === undefined) {
                    widgetData[widAttr.name] = widAttr.default;
                    this.reRenderWidgetEdit(widgets[i]);
                }
            }
        }

        // Depends on attribute type
        switch (widAttr.type) {
            case 'id':
                line = this.editObjectID(widAttr.name);
                break;
            case 'checkbox':
                // All other attributes
                line = '<input id="inspect_' + widAttr.name + '" type="checkbox"/>';
                break;

            case 'select-views':
                line = '<select multiple="multiple" id="inspect_' + widAttr.name + '" class="select-views"></select>';
                break;
            case 'color':
                line = this.editColor(widAttr.name);
                break;
            case 'number':
                line = this.editNumber(widAttr.name, widAttr.options);
                break;
            case 'slider':
                line = this.editSlider(widAttr.name, widAttr.options);
                break;
            case 'views':
                line = this.editViewName(widAttr.name);
                break;
            case 'custom':
                line = this.editCustom(widAttr.name, widAttr.options);
                break;
            case 'image':
                line = this.editUrl(widAttr.name);
                break;
            case 'sound':
                line = this.editUrl(widAttr.name, ['mp3', 'wav', 'ogg']);
                break;
            case 'select':
                line = this.editSelect(widAttr.name, widAttr.options, widAttr.notTranslate);
                break;
            case 'effect':
                line = this.editEffect(widAttr.name);
                break;
            case 'effect-options':
                line = this.editSelect(widAttr.name, {
                    'left':   _('left'),
                    'right':  _('right'),
                    'top':    _('top'),
                    'bottom': _('bottom')
                });
                break;
            case 'hidden':
                return;
                break;
            case 'fontname':
                line = this.editFontName(widAttr.name);
                break;
            default:
                line = '<input type="text" id="inspect_' + widAttr.name + '"/>';
        }

        if (typeof line == 'string') line = {input: line};

        if (line[0]) {
            line[0].attrName  = widAttr.clearName;
            line[0].attrIndex = widAttr.index;
        } else {
            line.attrName  = widAttr.clearName;
            line.attrIndex = widAttr.index;
        }

        if (widAttr.depends && widAttr.depends.length) line.depends = widAttr.depends;
        line.type = widAttr.type;

        // <tr><td>title:</td><td><input /></td><td>button</td></tr>
        this.groups[group] = this.groups[group] || {};
        this.groups[group][widAttr.name] = line;
    },
    getWidgetName: function (view, widget) {
        var widgetData = this.views[view].widgets[widget];
        var name = (widgetData.data ? widgetData.data.name : '');
        name = name ? (name + '[' + widget + ']') : widget;
        name += ' (' + $('#' + widgetData.tpl).attr('data-vis-name') + ')';
        return name;
    },
    showInspect: function (view, widgets) {
        var $widgetAttrs = $('#widget_attrs');
        var that = this;
        var depends = [];
        var values = {};
        for (var group in this.groups) {
            if (this.groupsState[group] === undefined) this.groupsState[group] = false;
            $widgetAttrs.append('<tr data-group="' + group + '" class="ui-state-default"><td colspan="3">' + _('group_' + group) + '</td><td><button class="group-control" data-group="' + group + '">' + group + '</button></td>')

            for (var widAttr in this.groups[group]) {
                var line = this.groups[group][widAttr];
                if (line[0]) line = line[0];
                if (typeof line == 'string') line = {input: line};
                var title = _(widAttr + '_tooltip');
                var icon;
                if (title == widAttr + '_tooltip') {
                    title = '';
                    icon = '';
                } else {
                    icon = '<div class="ui-icon ui-icon-notice" style="float: right"/>';
                }
                var text = '<tr class="vis-edit-td-caption group-' + group + '" id="td_' + widAttr + '"><td ' + (title ? 'title="' + title + '"' : '') + '>' + (icon ? '<i>' : '') + _(line.attrName) + (line.attrIndex !== '' ? ('[' + line.attrIndex + ']') : '') + ':' + (icon ? '</i>' : '') + '</td><td class="vis-edit-td-field"';

                if (!line.button && !line.css) {
                    text += ' colspan="3"';
                } else if (!line.css){
                    if (!line.button && !line.css) text += ' colspan="2"';
                } else if (!line.button){
                    text += ' colspan="2"';
                }

                text += '>' + (line.input || '') + '</td>';

                if (line.button) {
                    if (!line.button.html) {
                        text += '<td><button id="inspect_' + widAttr + '_btn">' + (line.button.text || line.button.title || '') + '</button></td>';
                    } else {
                        text += '<td>' + line.button.html + '</td>';
                    }
                }
                if (line.css) {
                    text += '<td><input id="steal_' + widAttr + '" type="checkbox" data-vis-steal="' + widAttr.substring(4) + '" class="vis-steal-css"/><label class="vis-steal-label" for="steal_' + widAttr + '">steal</label></td>';
                }

                text += '</tr>';

                $widgetAttrs.append(text);

                // Init button
                if (line.button) {
                    // If init function specified => call it
                    if (typeof line.button.code == 'function') {
                        line.button.code(line.button);
                    } else {
                        // init button
                        var $btn = $('#inspect_' + widAttr + '_btn').button({
                            text: line.button.text || false,
                            icons: {
                                primary: line.button.icon || ''
                            }
                        }).css({width: line.button.width || 22, height: line.button.height || 22});
                        if (line.button.click) $btn.click(line.button.click);
                        if (line.button.data)  $btn.data('data-custom', line.button.data);

                        $btn.data('data-wdata', {
                            attr:    widAttr,
                            widgets: widgets,
                            view:    view
                        });
                    }
                }

                // Init value
                var $input = $('#inspect_' + widAttr);

                if ($input.attr('type') == 'text') $input.addClass('vis-edit-textbox');

                // Set the value
                if ($input.attr('type') == 'checkbox') {
                    if (line.css) {
                        $input.prop('checked', this.findCommonValue(widgets, widAttr.substring(4), true));
                    } else {
                        if (values[widAttr] === undefined) values[widAttr] = this.findCommonValue(widgets, widAttr);
                        $input.prop('checked', values[widAttr]);
                    }
                } else {
                    if (line.css) {
                        $input.val(this.findCommonValue(widgets, widAttr.substring(4), true));
                    } else {
                        if (values[widAttr] === undefined) values[widAttr] = this.findCommonValue(widgets, widAttr);
                        $input.val(values[widAttr]);
                    }
                    $input.keyup(function () {
                        var $this = $(this);
                        var timer = $this.data('timer');
                        if (timer) clearTimeout(timer);

                        $this.data('timer', setTimeout(function () {
                            $this.data('timer', null);
                            $this.trigger('change');
                        }, 500));
                    });
                }
                var wdata = {
                    attr:    widAttr,
                    widgets: widgets,
                    view:    view,
                    type:    line.type,
                    css:     line.css
                };
                if (line.onchange) wdata.onchange = line.onchange;
                $input.addClass('vis-inspect-widget');
                $input.data('data-wdata', wdata);

                if (this.groups[group][widAttr][0]) {
                    for (var i = 1; i < this.groups[group][widAttr].length; i++) {
                        text = '<tr class="vis-edit-td-caption group-' + group + '"><td></td><td class="vis-edit-td-field" colspan="2">' + this.groups[group][widAttr][i].input + '</td>';
                        $widgetAttrs.append(text);
                    }
                }
                // Collect list of attribute names on which depends other attributes
                if (line.depends) {
                    for (var u = 0; u < line.depends.length; u++) {
                        if (depends.indexOf(line.depends[u]) == -1) depends.push(line.depends[u]);
                    }
                }
            }

            // Hide elements
            if (!this.groupsState[group]) $('.group-' + group).hide();
        }

        // Init all elements together
        for (var group in this.groups) {
            for (var widAttr in this.groups[group]) {
                var line = this.groups[group][widAttr];
                var $input = $('#inspect_' + widAttr);
                if (depends.length) $input.data('data-depends', depends);

                if (line[0]) line = line[0];
                if (typeof line == 'string') line = {input: line};
                if (typeof line.init == 'function') {
                    if (values[widAttr] === undefined) values[widAttr] = this.findCommonValue(widgets, widAttr);
                    line.init.call($input[0], widAttr, values[widAttr]);
                }
                // Call on change
                if (typeof line.onchange == 'function') {
                    if (values[widAttr] === undefined) values[widAttr] = this.findCommonValue(widgets, widAttr);
                    line.onchange.call($input[0], values[widAttr]);
                }
            }
        }
        this.initStealHandlers();

        var that = this;
        $('.vis-inspect-widget').change(function (e) {
            var $this   = $(this);
            var wdata   = $this.data('data-wdata');
            var depends = $this.data('data-depends');

            for (var i = 0; i < wdata.widgets.length; i++) {
                if (wdata.css) {
                    var css = wdata.attr.substring(4);
                    if (!that.views[wdata.view].widgets[wdata.widgets[i]].style) {
                        that.views[wdata.view].widgets[wdata.widgets[i]].style = {};
                    }
                    var val = $this.val();
                    that.views[wdata.view].widgets[wdata.widgets[i]].style[css] = val;
                    var $widget = $('#' + wdata.widgets[i]);
                    if (val !== '' && (css == 'left' || css == 'top')) {
                        if (val.indexOf('%') == -1 && val.indexOf('px') == -1 && val.indexOf('em') == -1) {
                            val += 'px'
                        }
                    }
                    $widget.css(css, val);
                    if (that.activeWidgets.indexOf(wdata.widgets[i]) != -1) {
                        that.showWidgetHelper(wdata.widgets[i], true);
                    }
                } else {
                    if ($this.attr('type') == 'checkbox') {
                        that.widgets[wdata.widgets[i]].data[wdata.attr] = $this.prop('checked');
                    } else {
                        that.widgets[wdata.widgets[i]].data[wdata.attr] = $this.val();
                    }
                    that.views[wdata.view].widgets[wdata.widgets[i]].data[wdata.attr] = that.widgets[wdata.widgets[i]].data[wdata.attr];
                }

                // Some user adds ui-draggable and ui-resizable as class to widget.
                // The result is DashUI tries to remove draggable and resizable properties and fails
                if (wdata.attr == 'class') {
                    var val = that.views[wdata.view].widgets[wdata.widgets[i]].data[wdata.attr];
                    if (val.indexOf('ui-draggable') != -1 || val.indexOf('ui-resizable') != -1) {
                        var vals = val.split(' ');
                        val = '';
                        for (var j = 0; j < vals.length; j++) {
                            if (vals[j] && vals[j] != 'ui-draggable' && vals[j] != 'ui-resizable') {
                                val += ((val) ? ' ' : '') + vals[j];
                            }
                        }
                        that.views[wdata.view].widgets[wdata.widgets[i]].data[wdata.attr] = val;
                        $this.val(val);
                    }
                }

                // Update select widget dropdown
                if (wdata.attr == 'name') {
                    this.$selectActiveWidgets.find('option[value="' + wdata.widgets[i] + '"]').text(that.getWidgetName(wdata.view, wdata.widgets[i]));
                    this.$selectActiveWidgets.multiselect('refresh');
                }

                if (typeof wdata.onchange == 'function') wdata.onchange.call(this, that.widgets[wdata.widgets[i]].data[wdata.attr]);

                that.save();
                if (!wdata.css) that.reRenderWidgetEdit(wdata.widgets[i]);

                // Rebuild attr list
                if (depends && depends.indexOf(wdata.attr) != -1) that.inspectWidgets();
            }

            //Update containers
            if (wdata.type == 'views') {
                // Set ths views for containers
                that.updateContainers(wdata.view);
            }
        });

        $('.group-control').each(function () {
            var group = $(this).attr('data-group');
            $(this).button({
                text: false,
                icons: {
                    primary: that.groupsState[group] ? "ui-icon-triangle-1-n" : "ui-icon-triangle-1-s"
                }
            }).css({width: 22, height: 22}).click(function () {
                var group = $(this).attr('data-group');
                that.groupsState[group] = !that.groupsState[group];
                $(this).button('option', {
                    icons: {primary: that.groupsState[group] ? "ui-icon-triangle-1-n" : "ui-icon-triangle-1-s"}
                });
                if (that.groupsState[group]) {
                    $('.group-' + group).show();
                } else {
                    $('.group-' + group).hide();
                }
                if (typeof storage != 'undefined') {
                    storage.set('groups', JSON.stringify(that.groupsState));
                }
            });
        });
    },
    showWidgetHelper: function (wid, isShow) {
        if (isShow) {
            var $widget = $('#' + wid);
            var pos   = $widget.position();

            // May be bug?
            if (pos.left == 0 && pos.top == 0) {
                pos.left = $widget[0].style.left;
                pos.top  = $widget[0].style.top;
                if (typeof pos.left == 'string') pos.left = parseInt(pos.left.replace('px', ''), 10);
                if (typeof pos.top  == 'string') pos.top  = parseInt(pos.top.replace('px', ''), 10);
            }

            if (!$('#widget_helper_' + wid).length) {
                $('#vis_container').append('<div id="widget_helper_' + wid + '" class="widget-helper"><div class="widget-multi-inner-helper"></div></div>');
            }

            $('#widget_helper_' + wid).css({
                    left:   pos.left - 2,
                    top:    pos.top  - 2,
                    height: $widget.outerHeight() + 2,
                    width:  $widget.outerWidth()  + 2
                }
            ).show();
        } else {
            $('#widget_helper_' + wid).remove();
        }
    },
    extractAttributes: function (_wid_attr, widget) {
        // Format: attr_name(start-end)[default_value]/type
        // attr_name can be extended with numbers (1-2) means it will be attr_name1 and attr_name2 created
        // defaultValue: If defaultValue has ';' it must be replaced by §
        // Type format: id - Object ID Dialog
        //              checkbox
        //              image - image
        //              number,min,max,step - non-float number. min,max,step are optional
        //              color - color picker
        //              views - Name of the view
        //              effect - jquery UI show/hide effects
        //              eff_opt - additional option to effect slide (up, down, left, right)
        //              fontName - Font name
        //              slider,min,max,step - Default step is ((max - min) / 100)
        //              select,value1,value2,... - dropdown select
        //              custom,functionName,options,... - functionName is starting from vis.binds.[widgetset.funct]. E.g. custom/timeAndWeather.editWeather,short
        //              group.name - define new or old group. All following attributes belongs to new group till new group.xyz


        //returns array of all attributes with groups
        /*var oneAttr = {
            name:         '',
            type:         '',
            default:      '',
            options:      '',
            notTranslate: false,
            depends:      []
        }
        Result: array of oneAttr
        */

        if (!this.regexAttr) this.regexAttr = /([a-zA-Z0-9._-]+)(\([a-zA-Z.0-9-_]*\))?(\[.*])?(\/[-_,\.a-zA-Z0-9]+)?/;
        var match = this.regexAttr.exec(_wid_attr);

        var widAttr     = match[1];
        var wid_repeats  = match[2];
        var wid_default  = match[3];
        var wid_type     = match[4];
        var wid_type_opt = null;
        var notTranslate = true;
        var index        = '';
        var attrDepends  = [];

        // remove /
        if (wid_type) {
            wid_type = wid_type.substring(1);
            var parts = wid_type.split(',');
            // extract min,max,step or select values
            if (parts.length > 1) {
                wid_type = parts.shift();
                wid_type_opt = parts;
            }
        }
        // remove ()
        if (wid_repeats) {
            wid_repeats = wid_repeats.substring(1, wid_repeats.length - 1);
            var parts = wid_repeats.split('-', 2);
            if (parts.length == 2) {
                wid_repeats = {
                    start: parseInt(parts[0], 10),
                    end:   parseInt(parts[1], 10)
                };
                // If end is not number, it can be attribute
                if (parts[1][0] < '0' || parts[1][0] > '9') {
                    var view         = this.getViewOfWidget(widget);
                    var widgetData   = this.views[view].widgets[widget].data;
                    wid_repeats.end = (widgetData[parts[1]] !== undefined) ? parseInt(widgetData[parts[1]], 10) : 1;
                    attrDepends.push(parts[1]);
                }

                index = wid_repeats.start;
            } else {
                throw 'Invalid repeat argument: ' + wid_repeats;
            }
        }
        // remove []
        if (wid_default) {
            wid_default = wid_default.substring(1, wid_default.length - 1);
            wid_default = wid_default.replace(/§/g, ';');
        } else {
            wid_default = undefined;
        }

        if (widAttr == 'color') {
            wid_type = 'color';
        } else if (widAttr == 'oid' || widAttr.match(/^oid-/)) {
            wid_type = 'id';
        } else if (widAttr.match(/nav_view$/)) {
            wid_type = 'views';
        } else
        /*if (widAttr.match(/src$/)) {
         wid_type = 'image';
         } else*/
        if (widAttr == 'url' || widAttr == 'sound') {
            wid_type = 'sound';
        } else if (widAttr.indexOf('_effect') != -1) {
            wid_type = 'effect';
        } else if (widAttr.indexOf('_eff_opt') != -1) {
            wid_type = 'effect-options';
        }
        if (wid_type == 'nselect') {
            wid_type = 'select';
            notTranslate = true;
        }

        // Extract min, max, step for number and slider
        if ((wid_type == 'number' || wid_type == 'slider') && wid_type_opt) {
            var old = wid_type_opt;
            var wid_type_opt = {};
            if (old[0] !== undefined) {
                wid_type_opt.min = parseFloat(old[0]);
                if (old[1] !== undefined) {
                    wid_type_opt.max = parseFloat(old[1]);
                    if (old[2] !== undefined) {
                        wid_type_opt.step = parseFloat(old[2]);
                    }
                }
            }
        }
        var result = [];
        do {
            result.push({
                name:         (widAttr + index),
                type:         wid_type,
                default:      wid_default,
                options:      wid_type_opt,
                notTranslate: notTranslate,
                depends:      attrDepends,
                clearName:    widAttr,
                index:        index
            });
        } while (wid_repeats && ((++index) <= wid_repeats.end));
        return result;
    },
    findCommonAttributes: function (widgets) {
        var allWidgetsAttr = null;
        for (var i = 0; i < widgets.length; i++) {
            var widget = this.views[this.activeView].widgets[widgets[i]];

            if (!widget) {
                console.log('inspectWidget ' + widgets[i] + ' undefined');
                return [];
            }

            if (!widget.tpl) return false;

            var $widgetTpl = $('#' + widget.tpl);
            if (!$widgetTpl) {
                console.log(widget.tpl + " is not included");
                return [];
            }
            var widgetAttrs = $widgetTpl.attr('data-vis-attrs');
            if (widgetAttrs) {
                widgetAttrs = widgetAttrs.split(';');
            } else {
                widgetAttrs = [];
            }
            var group = 'common';
            var attrs = {};
            for (var j = 0; j < widgetAttrs.length; j++) {
                if (widgetAttrs[j].match(/^group\./)) {
                    group = widgetAttrs[i].substring('group.'.length);
                    continue;
                }
                if (!widgetAttrs[j]) continue;

                attrs[group] = attrs[group] || {};
                var a = this.extractAttributes(widgetAttrs[j], widgets[i]);
                for (var k = 0; k < a.length; k++) {
                    attrs[group][a[k].name] = a[k];
                }
            }

            if (!allWidgetsAttr) {
                allWidgetsAttr = attrs;
            } else {
                // Combine these too groups
                for (group in allWidgetsAttr) {
                    if (!attrs[group]) delete allWidgetsAttr[group];
                }
                for (group in attrs) {
                    if (!allWidgetsAttr[group]) delete attrs[group];
                }
                for (group in allWidgetsAttr) {
                    for (var name in allWidgetsAttr[group]) {
                        if (!attrs[group][name]) delete allWidgetsAttr[group][name];
                    }
                    for (name in attrs[group]) {
                        if (!allWidgetsAttr[group][name]) delete attrs[group][name];
                    }
                    for (name in allWidgetsAttr[group]) {
                        if (JSON.stringify(allWidgetsAttr[group][name]) != JSON.stringify(attrs[group][name])) delete allWidgetsAttr[group][name];
                    }
                }
            }
        }

        return allWidgetsAttr;
    },
    findCommonValue: function (widgets, attr, isStyle) {
        var value = '-------no one set something -------------';
        for (var i = 0; i < widgets.length; i++) {
            var widget = this.views[this.activeView].widgets[widgets[i]];
            var obj = isStyle ? widget.style : widget.data;
            if (!obj) obj = {};
            if (isStyle && obj[attr] === undefined) obj[attr] = '';
            if (value == '-------no one set something -------------') {
                value = obj[attr];
            } else {
                if (value != obj[attr]) {
                    return '--different--';
                }
            }
        }
        return value;
    },
    inspectWidgets: function (addWidget, delWidget, onlyUpdate) {
        if (this.isStealCss) return false;

        if (typeof addWidget == 'boolean') {
            onlyUpdate = addWidget;
            addWidget = undefined;
            delWidget = undefined;
        }
        if (addWidget) {
            if (typeof addWidget == 'object') {
                this.activeWidgets = addWidget;
            } else {
                if (this.activeWidgets.indexOf(addWidget) == -1) this.activeWidgets.push(addWidget);
            }
        }
        if (typeof delWidget == 'string') {
            var pos = this.activeWidgets.indexOf(delWidget);
            if (pos != -1) this.activeWidgets.splice(pos, 1);
        }
        var that = this;
        var wid = this.activeWidgets[0] || 'none';
        // find view
        var view = this.getViewOfWidget(wid);

        if (!onlyUpdate) {
            //$('#allwidgets_helper').hide();

            //this.$selectActiveWidgets.find('option[value="' + wid + '"]').prop('selected', true);
            //this.$selectActiveWidgets.multiselect('refresh');
            var $widget;
            var select   = [];
            var deselect = [];

            for (var i = 0; i < this.activeWidgets.length; i++) {
                if (this.oldActiveWidgets.indexOf(this.activeWidgets[i]) == -1) select.push(this.activeWidgets[i]);
            }
            for (i = 0; i < this.oldActiveWidgets.length; i++) {
                if (this.activeWidgets.indexOf(this.oldActiveWidgets[i]) == -1) deselect.push(this.oldActiveWidgets[i]);
            }

            // Deselect unselected widgets
            for (i = 0; i < deselect.length; i++) {
                this.showWidgetHelper(deselect[i], false);
                var $widget = $('#' + deselect[i]);
                $widget.removeClass('ui-selected');
                this.$selectActiveWidgets.find('option[value="' + deselect[i] + '"]').removeAttr('selected');

                if ($widget.hasClass('ui-draggable')) {
                    try {
                        $widget.draggable('destroy');
                    } catch (e) {
                        this.conn.logError('inspectWidget - Cannot destroy draggable ' + deselect[i] + ' ' + e);
                    }
                }

                if ($widget.hasClass('ui-resizable')) {
                    try {
                        $widget.resizable('destroy');
                    } catch (e) {
                        this.conn.logError('inspectWidget - Cannot destroy resizable ' + deselect[i] + ' ' + e);
                    }
                }
            }
            // disable resize if widget not more selected alone
            if (this.oldActiveWidgets.length == 1 && this.activeWidgets.length != 1) {
                var $widget = $('#' + this.oldActiveWidgets[0]);
                if ($widget.hasClass('ui-resizable')) {
                    try {
                        $widget.resizable('destroy');
                    } catch (e) {
                        this.conn.logError('inspectWidget - Cannot destroy resizable ' + deselect[i] + ' ' + e);
                    }
                }
            }

            // Select selected widgets
            for (var i = 0; i < select.length; i++) {
                $widget = $('#' + select[i]);
                this.$selectActiveWidgets.find('option[value="' + select[i] + '"]').attr('selected', 'selected');
                this.showWidgetHelper(select[i], true);
                this.draggable($widget);
            }

            // Enable disable buttons
            if (this.activeWidgets.length) {
                $('#rib_wid_del').button('enable');
                $('#rib_wid_copy').button('enable');
                $('#rib_wid_doc').button('enable');
            } else {
                $('#rib_wid_del').button('disable');
                $('#rib_wid_copy').button('disable');
                $('#rib_wid_doc').button('disable');
            }
            if (this.activeWidgets.length == 1) {
                $widget = $('#' + this.activeWidgets[0]);
                if (!$widget.hasClass('ui-resizable')) {
                    this.resizable($widget);
                }
            }
            this.oldActiveWidgets = [];
            for (var k = 0; k < this.activeWidgets.length; k++) {
                this.oldActiveWidgets.push(this.activeWidgets[k]);
            }
            // update selected widgets dropdown
            this.$selectActiveWidgets.multiselect('refresh');

            // Disable copy widget if was active
            $("#rib_wid_copy_cancel").trigger('click');

            this.actualAttrs = this.findCommonAttributes(this.activeWidgets);
        }

        var $widgetAttrs = $('#widget_attrs');
        this.groups = {};
        // Clear Inspector
        $widgetAttrs.html('');

        if (!wid || wid === 'none') {
            // Switch tabs to View settings
            $('#attr_wrap').tabs({active: 1}).tabs('option', 'disabled', [0]);
            return false;
        }
        $('#attr_wrap').tabs({active: 1}).tabs('option', 'disabled', []);
        $('#attr_wrap').tabs({active: 0});

        var widget = this.views[this.activeView].widgets[wid];

        if (!widget) {
            console.log('inspectWidget ' + wid + ' undefined');
            return false;
        }

        if (!widget.tpl) return false;

        var $widgetTpl = $('#' + widget.tpl);
        if (!$widgetTpl) {
            console.log(widget.tpl + " is not included");
            return false;
        }
        var widgetAttrs = $widgetTpl.attr('data-vis-attrs');
        if (widgetAttrs) {
            widgetAttrs = widgetAttrs.split(';');
        } else {
            widgetAttrs = [];
        }
        var widgetFilter = $widgetTpl.attr('data-vis-filter');

        $('#inspect_comment_tr').show();
        $('#inspect_class_tr').show();
        var widgetDiv = document.getElementById(wid);

        $widgetAttrs.css({"width": "100%"});

        // Add fixed attributes
        var group = 'fixed';
        this.addToInspect(this.activeWidgets, 'name',               group);
        this.addToInspect(this.activeWidgets, 'comment',            group);
        this.addToInspect(this.activeWidgets, 'class',              group);
        this.addToInspect(this.activeWidgets, 'filterkey',          group);
        this.addToInspect(this.activeWidgets, {name: 'views', type: 'select-views'}, group);

        // Edit all attributes
        group = 'common';
        for (group in this.actualAttrs) {
            for (var attr in this.actualAttrs[group]) {
                this.addToInspect(this.activeWidgets, this.actualAttrs[group][attr], group);
            }
        }
        if(0)
        for (var i = 0; i < widgetAttrs.length; i++) {
            if (widgetAttrs[i].match(/^group\./)) {
                group = widgetAttrs[i].substring('group.'.length);
                continue;
            }
            if (widgetAttrs[i] != '') this.addToInspect(wid, widgetAttrs[i], group);
            /*
            if (widgetAttrs[attr] != '') {
                // Format: attr_name(start-end)[default_value]/type
                // attr_name can be extended with numbers (1-2) means it will be attr_name1 and attr_name2 created
                // defaultValue: If defaultValue has ';' it must be replaced by §
                // Type format: id - Object ID Dialog
                //              checkbox
                //              image - image
                //              color - color picker
                //              views - Name of the view
                //              effect - jquery UI show/hide effects
                //              eff_opt - additional option to effect slide (up, down, left, right)
                //              fontName - Font name
                //              slider,min,max,step - Default step is ((max - min) / 100)
                //              select_value1,select_value2,... - dropdown select
                //              hr
                //              br

                var isValueSet = false;
                var wid_attrs = widgetAttrs[attr].split('/');
                var widAttr = wid_attrs[0];
                // Try to extract default value
                var uu = widAttr.indexOf('[');
                var defaultValue = null;
                if (uu != -1) {
                    var defaultValue = widAttr.substring(uu + 1);
                    defaultValue = defaultValue.substring(0, defaultValue.length - 1);
                    defaultValue = defaultValue.replace(/§/g, ';');
                    widAttr = widAttr.substring(0, uu);
                }
                var type = (wid_attrs.length > 1) ? wid_attrs[1] : null;
                if (type && type.indexOf(',') != -1) {
                    if (type.substring(0, 'slider'.length) == 'slider') {
                        type = 'slider';
                    } else {
                        type = 'select';
                    }
                }

                // Try to extract repeat value
                uu = widAttr.indexOf('(');
                var instancesStart = null;
                var instancesStop = null;
                if (uu != -1) {
                    var instances = widAttr.substring(uu + 1);
                    instances = instances.substring(0, instances.length - 1);
                    widAttr = widAttr.substring(0, uu);
                    // Now instances has 1-8
                    instances = instances.split('-');
                    if (instances.length > 1) {
                        instancesStart = parseInt(instances[0], 10);
                        instancesStop = parseInt(instances[1], 10);
                        if (instancesStart > instancesStop) {
                            var tmp = instancesStop;
                            instancesStop = instancesStart;
                            instancesStart = tmp;
                        }
                        instancesStop++;
                    }
                }

                do {
                    var wid_attr_ = widAttr + ((instancesStart !== null) ? instancesStart : '');
                    var isCustomEdit = false;

                    if (defaultValue !== null && (widget.data[wid_attr_] == null || widget.data[wid_attr_] === undefined)) {
                        widget.data[wid_attr_] = defaultValue;
                        vis.reRenderWidgetEdit(vis.activeWidget);
                    }

                    // If completely custom edit
                    if (widgetDiv && widgetDiv.visCustomEdit && widgetDiv.visCustomEdit[wid_attr_]) {
                        widgetDiv.visCustomEdit[wid_attr_](vis.activeWidget, $widgetAttrs);
                    } else if (widgetDiv &&
                            // If only one attribute is custom edited, eg hqoptions
                        widgetDiv._customHandlers &&
                        widgetDiv._customHandlers.onOptionEdited &&
                        widgetDiv._customHandlers.isOptionEdited(wid_attr_)) {
                        widgetDiv._customHandlers.onOptionEdited({
                            widgetDiv: widgetDiv,
                            widgetId: vis.activeWidget,
                            attr: wid_attr_,
                            parent: $widgetAttrs,
                            imgSelect: vis.imageSelect,
                            clrSelect: colorSelect,
                            styleSelect: vis.styleSelect
                        });
                    }
                    else if (wid_attr_ === "oid" || type == 'id') {
                        vis.editObjectID(widget, wid_attr_, widgetFilter);
                    } else if (wid_attr_ === "oid-working") {
                        vis.editObjectID(widget, wid_attr_, 'WORKING');
                    } else if (wid_attr_.indexOf('src') == wid_attr_.length - 3 || type == "image") {
                        vis.editImage(widget, wid_attr_);
                    } else if (wid_attr_ == "url") {
                        vis.editUrl(widget, wid_attr_);
                    } else if (wid_attr_ === "weoid") {
                        // Weather ID
                        $('#widget_attrs').append('<tr class="vis-add-option"><td id="option_' + wid_attr_ + '" ></td></tr>');
                        $('#inspect_comment_tr').hide();
                        $('#inspect_class_tr').hide();
                        $('#option_' + wid_attr_).jweatherCity({
                            lang: this.language, currentValue: widget.data[wid_attr_],
                            onselect: function (wid, text) {
                                vis.widgets[vis.activeWidget].data.attr('weoid', text);
                                vis.views[vis.activeView].widgets[vis.activeWidget].data['weoid'] = text;
                                vis.save();
                                vis.reRenderWidgetEdit(vis.activeWidget);
                            }
                        });
                    } else if (wid_attr_ === "color" || type == "color") {
                        vis.editColor(widget, wid_attr_);
                    } else if (type === "checkbox") {
                        isValueSet = true;
                        vis.editCheckbox(widget, wid_attr_);
                    } else if (type === "fontname") {
                        isValueSet = true;
                        vis.editFontName(widget, wid_attr_);
                    } else if (type === "slider") {
                        isValueSet = true;
                        var values = wid_attrs[1].split(',');
                        vis.editSlider(widget, wid_attr_, values[1], values[2], values[3]);
                        isCustomEdit = true;
                    } else if (type === "select") {
                        isValueSet = true;
                        var values = wid_attrs[1].split(',');
                        vis.editSelect(widget, wid_attr_, values);
                    } else if (wid_attr_.indexOf('nav_view') != -1 || type == "views") {
                        vis.editViewName(widget, wid_attr_);
                        isCustomEdit = true;
                    } else if (type == "hidden") {
                        isCustomEdit = true;
                    } else if (wid_attr_.indexOf('_effect') != -1 || type == "effect") {
                        vis.editEffects(widget, wid_attr_);
                        isCustomEdit = true;
                    } else if (wid_attr_.indexOf('_eff_opt') != -1 || type == "effect_opt") {
                        vis.editEffects_opt(widget, wid_attr_);
                        isCustomEdit = true;
                    } else if (wid_attr_.indexOf('_hr') != -1) {
                        vis.hr(widget, wid_attr_);
                        isCustomEdit = true;
                    } else if (wid_attr_.indexOf('_br') != -1) {
                        vis.br(widget, wid_attr_);
                        isCustomEdit = true;
                    } else if (wid_attr_.slice(0, 4) !== "html") {
                        if (type !== null) {
                            // If description is JSON object
                            if (type.indexOf('{') != -1) {
                                try {
                                    type = jQuery.parseJSON(type);
                                }
                                catch (e) {
                                    type = null;
                                    $('#widget_attrs').append('<tr id="option_' + wid_attr_ + '" class="vis-add-option"><td class="vis-edit-td-caption">' + _(wid_attr_) + ':</td><td><input type="text" id="inspect_' + wid_attr_ + '" size="34"/></td></tr>');
                                }
                            }

                            if (type !== null) {
                                if (typeof type == 'object') {
                                    var title = _(wid_attr_);
                                    var hint = '';
                                    if (type["name"]) {
                                        if (typeof type["name"] == 'object') {
                                            if (type["name"][this.language]) {
                                                title = type["name"][this.language];
                                            } else if (type["name"]['en']) {
                                                title = type["name"]['en'];
                                            }
                                        } else {
                                            title = type["name"];
                                        }
                                    }


                                    if (type['type'] == "checkbox") {
                                        isValueSet = true;
                                        // All other attributes
                                        $('#widget_attrs').append('<tr id="option_' + wid_attr_ + '" class="vis-add-option"><td class="vis-edit-td-caption" title="' + hint + '">' + title + ':</td><td><input title="' + hint + '" id="inspect_' + wid_attr_ + '" type="checkbox"' + (widget.data[wid_attr_] ? "checked" : '') + '></td></tr>');
                                    } else if (type['type'] == "view") {
                                    } else if (type['type'] == "color") {
                                    } else if (type['type'] == "font") {
                                    } else if (type['type'] == "rooms") {
                                    } else if (type['type'] == "favorites") {
                                    } else if (type['type'] == "functions") {
                                    } else if (type['type'] == "rooms") {
                                    } else if (type['type'] == "select") {
                                        // Select
                                        var values = type['values'];
                                        var text = '<tr id="option_' + wid_attr_ + '" class="vis-add-option"><td class="vis-edit-td-caption">' + _(wid_attr_) + ':</td><td><select id="inspect_' + wid_attr_ + '">';
                                        for (var t = 0; t < values.length; t++) {
                                            text += "<option value='" + values[t] + "' " + ((values[t] == widget.data[wid_attr_]) ? 'selected' : '') + ">" + _(values[t]) + "</option>";
                                        }
                                        text += "</select></td></tr>";
                                        $('#widget_attrs').append(text);
                                        isValueSet = true;
                                    }

                                } else {
                                    // Simple type
                                    servConn.logError('Unknown attribute type ' + wid_attr_ + " Type: " + type);
                                }
                            }
                        } else {
                            // html
                            $('#widget_attrs').append('<tr id="option_' + wid_attr_ + '" class="vis-add-option"><td class="vis-edit-td-caption">' + _(wid_attr_) + ':</td><td><input type="text" id="inspect_' + wid_attr_ + '" size="34"/></td></tr>');
                        }
                    } else {
                        // Text area
                        $('#widget_attrs').append('<tr id="option_' + wid_attr_ + '" class="vis-add-option"><td class="vis-edit-td-caption">' + _(wid_attr_) + ':</td><td><textarea id="inspect_' + wid_attr_ + '" rows="2" cols="34"></textarea></td></tr>');
                    }

                    if (!isCustomEdit) {
                        var inspect = $('#inspect_' + wid_attr_);

                        if (!isValueSet) {
                            inspect.val(widget.data[wid_attr_]);
                        }
                        inspect.change(function () {
                            var attribute = $(this).attr('id').slice(8);
                            var val = $(this).val();
                            if (this.type == "checkbox") {
                                val = $(this).prop('checked');
                            }
                            if (attribute == "oid" || attribute == "oid-working") {
                                $('#inspect_' + attribute + "_desc").html(vis.getObjDesc(val));
                            }
                            vis.widgets[vis.activeWidget].data.attr(attribute, val);
                            vis.views[vis.activeView].widgets[vis.activeWidget].data[attribute] = val;
                            vis.save();
                            vis.reRenderWidgetEdit(vis.activeWidget);
                        }).keyup(function () {
                            $(this).trigger('change');
                        });


                    if (instancesStart !== null) {
                        instancesStart++;
                    }
                } while (instancesStart != instancesStop);}
            }*/
        }

        // Add common css
        this.editCssCommon();
        this.editCssFontText();
        this.editCssBackground();
        this.editCssBorder();
        this.editCssShadowPadding();

        this.showInspect(view, this.activeWidgets);

        // autocomplete for filter key
        var $elem = $('#inspect_filterkey');
        if ($elem.length) {
            this.updateFilter();
            $elem.data('save', function () {
                var $this = $(this);
                if ($this.data('timer')) clearTimeout($this.data('timer'));

                $this.data('timer', setTimeout(function () {
                    // If really changed
                    var attr = $this.attr('id').slice(8);
                    for (var i = 0; i < that.activeWidgets.length; i++) {
                        that.views[that.activeView].widgets[that.activeWidgets[i]].data[attr] = $this.val();
                    }
                    that.save();
                }, 200));
            });

            $elem.autocomplete({
                minLength: 0,
                source: function (request, response) {
                    var data = $.grep(that.views[that.activeView].filterList, function (value) {
                        return value.substring(0, request.term.length).toLowerCase() == request.term.toLowerCase();
                    });
                    response(data);
                },
                select: function (event, ui) {
                    $(this).data('save')();
                },
                change: function (event, ui) {
                    $(this).data('save')();
                }
            }).focus(function () {
                $(this).autocomplete('search', '');
            }).keyup(function () {
                $(this).data('save')();
            });
        }

        if ($('#snap_type option:selected').val() == 2) {
            this.gridWidth = parseInt($('#grid_size').val());

            if (this.gridWidth < 1 || isNaN(this.gridWidth)) this.gridWidth = 10;

            for (var i = 0; i < this.activeWidgets.length; i++) {
                var $this = $('#' + this.activeWidgets[i]);
                var x = parseInt($this.css('left'));
                var y = parseInt($this.css('top'));

                x = Math.floor(x / this.gridWidth) * this.gridWidth;
                y = Math.floor(y / this.gridWidth) * this.gridWidth;

                $this.css({'left': x, 'top': y});
            }
        }
        // SJ: it is done at the start of the function
        // User interaction
        /*if(!$("#wid_all_lock_d").hasClass("ui-state-active")) {
            if (!this.widgets[wid].data._no_move)   this.draggable($this);
            if (!this.widgets[wid].data._no_resize) this.resizable($this);
        }*/
    },
    // Init all edit fields for one view
    changeViewEdit: function (view, noChange) {
        var that = this;
        if (this.selectable) {
            $('.vis-view.ui-selectable').selectable('destroy');

            $('#visview_' + view).selectable({
                filter:    'div.vis-widget',
                tolerance: 'fit',
                cancel:    'div.vis-widget',
                stop: function (e, ui) {
                    if (!$('.ui-selected').length) {
                        that.inspectWidgets([]);
                   } else {
                        var newWidgets = [];
                        $('.ui-selected').each(function () {
                            console.log('Stop selection ' + $(this).attr('id'));
                            if ($(this).attr('id')) newWidgets.push($(this).attr('id'));
                        });
                        that.inspectWidgets(newWidgets);
                    }
                    //$('#allwidgets_helper').hide();
                },
                selecting: function (e, ui) {
                    console.log('selecting ' + ui.selecting.id);
                    if (ui.selecting.id && that.activeWidgets.indexOf(ui.selecting.id) == -1) {
                        that.activeWidgets.push(ui.selecting.id);
                        that.showWidgetHelper(ui.selecting.id, true);
                    }
                },
                unselecting: function (e, ui) {
                    console.log('unselecting ' + ui.unselecting.id);
                    var pos = that.activeWidgets.indexOf(ui.unselecting.id);
                    if (pos != -1) {
                        that.activeWidgets.splice(pos, 1);
                        that.showWidgetHelper(ui.unselecting.id, false);
                    }
                    /*if ($('#widget_helper_' + ui.unselecting.id).html()) {
                        $("#widget_helper_" + ui.unselecting.id).remove();
                        that.activeWidgets.splice(that.activeWidgets.indexOf(ui.unselecting.id), 1);
                    }*/
                }
            });
        }

        if (!noChange) {
            this.undoHistory = [$.extend(true, {}, this.views[view])];
            $('#button_undo').addClass('ui-state-disabled').removeClass('ui-state-hover');
            this.inspectWidgets([]);
        }

        // Disable rename if enabled
        $("#rib_view_copy_cancel").trigger('click');
        $("#rib_view_rename_cancel").trigger('click');
        $("#rib_view_add_cancel").trigger('click');

        // Load meta data if not yet loaded
        if (!this.objects) {
            // Read all data objects from server
            this.conn.getObjects(function (data) {
                that.objects = data;
            });
        }

        // Init background selector
        if (this.styleSelect && this.views[view] && this.views[view].settings) {
            this.styleSelect.Show({
                width:      '100%',
                name:       'inspect_view_bkg_def',
                filterName: 'background',
                //filterFile: "backgrounds.css",
                style: this.views[view].settings.style.background_class,
                parent: $('#inspect_view_bkg_parent'),
                onchange: function (newStyle, obj) {
                    if (that.views[view].settings.style['background_class']) {
                        $('#visview_' + view).removeClass(that.views[view].settings.style['background_class']);
                    }
                    that.views[view].settings.style['background_class'] = newStyle;
                    if (newStyle) $('#inspect_view_css_background').val('').trigger('change');

                    $('#visview_' + view).addClass(that.views[view].settings.style['background_class']);
                    that.save();
                }
            });
        }

        if (this.views[view] && this.views[view].settings) {
            // Try to find this resolution in the list
            var res = this.views[view].settings.sizex + 'x' + this.views[view].settings.sizey;
            $('#screen_size option').each(function () {
                if ($(this).val() == res) {
                    $(this).attr('selected', true);
                    res = null;
                }
            });
            if (!res) {
                $('#screen_size_x').prop('disabled', true);
                $('#screen_size_y').prop('disabled', true);
            }

            $('#screen_size_x').val(this.views[view].settings.sizex || '').trigger('change');
            $('#screen_size_y').val(this.views[view].settings.sizey || '').trigger('change');

            $('#screen_hide_description').prop('checked', this.views[view].settings.hideDescription).trigger('change');

            /*if (typeof hqWidgets != 'undefined') {
             hqWidgets.SetHideDescription(vis.views[view].settings.hideDescription);
             }*/

            $('#grid_size').val(this.views[view].settings.gridSize || '').trigger('change');

            var snapType = this.views[view].settings.snapType || 0;

            $('#snap_type option').removeAttr('selected');
            $('#snap_type option[value="' + snapType + '"]').attr('selected', true);
        }

        this.$selectActiveWidgets.html('');//('<option value="none">' + _('none selected') + '</option>');

        if (this.views[view].widgets) {
            for (var widget in this.views[view].widgets) {
                this.$selectActiveWidgets.append('<option value="' + widget + '">' + this.getWidgetName(view, widget) + '</option>');
            }
        }

        this.$selectActiveWidgets.multiselect('refresh');

        // Show current view
        if (this.$selectView.val() != view) {
            this.$selectView.val(view);
            this.$selectView.selectmenu('refresh');
        }
        this.$copyWidgetSelectView.val(view);
        this.$copyWidgetSelectView.selectmenu('refresh');

        // Show tab
        $('.view-select-tab').removeClass('ui-tabs-active ui-state-active');
        $('#view_tab_' + view).addClass('ui-tabs-active ui-state-active');

        // View CSS Inspector
        $('.vis-inspect-view-css').each(function () {
            var $this = $(this);
            var attr = $this.attr('id').slice(17);
            var css = $('#visview_' + view).css(attr);
            $this.val(css);
        });

        if (this.views[view] && this.views[view].settings) {
            $('.vis-inspect-view').each(function () {
                var $this = $(this);
                var attr = $this.attr('id').slice(13);
                $('#' + $this.attr('id')).val(that.views[view].settings[attr]);
            });

            this.views[view].settings['theme'] = this.views[view].settings['theme'] || 'redmond';

            $('#inspect_view_theme').val(this.views[view].settings.theme);
        }
        $('#inspect_view_theme').selectmenu('refresh');
    },
    dragging: false,
    draggable: function (obj) {
        var origX, origY;
        var that = this;
        var draggableOptions = {
            cancel: false,
            start: function (event, ui) {
                that.dragging = true;
                origX = ui.position.left;
                origY = ui.position.top;
            },
            stop: function (event, ui) {
                //var mWidget = document.getElementById(widget);
                //var pos = $('#' + widget).position();

                /*if (!that.views[that.activeView].widgets[widget].style) {
                    that.views[that.activeView].widgets[widget].style = {};
                }

                if (pos) {
                    $('#inspect_css_top').val(pos.top + 'px');
                    $('#inspect_css_left').val(pos.left + 'px');
                    that.views[that.activeView].widgets[widget].style.left = pos.left;
                    that.views[that.activeView].widgets[widget].style.top  = pos.top;
                }*/


                //if (mWidget._customHandlers && mWidget._customHandlers.onMoveEnd) {
                //    mWidget._customHandlers.onMoveEnd(mWidget, widget);
                //}

                for (var i = 0; i < that.activeWidgets.length; i++) {
                    var wid = that.activeWidgets[i];
                    var $wid = $('#' + that.activeWidgets[i]);
                    var pos = $wid.position();
                    if (!that.views[that.activeView].widgets[wid].style) that.views[that.activeView].widgets[wid].style = {};

                    pos.left = pos.left.toFixed(0);
                    pos.top  = pos.top.toFixed(0);

                    that.views[that.activeView].widgets[wid].style.left = pos.left;
                    that.views[that.activeView].widgets[wid].style.top  = pos.top;

                    if ($wid[0]._customHandlers && $wid[0]._customHandlers.onMoveEnd) {
                        mWidget._customHandlers.onMoveEnd($wid[0], wid);
                    }
                }
                $('#inspect_css_top').val(that.findCommonValue(that.activeWidgets, 'top', true));
                $('#inspect_css_left').val(that.findCommonValue(that.activeWidgets, 'left', true));
                that.save();
                setTimeout(function () {
                    that.dragging = false;
                }, 20);

            },
            drag: function (event, ui) {

                var moveX = ui.position.left - origX;
                var moveY = ui.position.top - origY;

                origX = ui.position.left;
                origY = ui.position.top;

                for (var i = 0; i < that.activeWidgets.length; i++) {
                    var mWidget = document.getElementById(that.activeWidgets[i]);
                    var $mWidget = $(mWidget);
                    var pos = $mWidget.position();
                    var x = pos.left + moveX;
                    var y = pos.top + moveY;

                    $('#widget_helper_' + that.activeWidgets[i]).css({left: x - 2, top: y - 2});

                    if (ui.helper.attr('id') != that.activeWidgets[i]) {
                        $mWidget.css({left: x, top: y});
                    }

                    if (mWidget._customHandlers && mWidget._customHandlers.onMove) {
                        mWidget._customHandlers.onMove(mWidget, vis.activeWidgets[i]);
                    }
                }
                /*var mWidget = document.getElementById(vis.activeWidget);

                if (ui.helper.attr('id') == vis.activeWidget) {
                    $('#widget_helper').css({left: origX - 2, top: origY - 2});
                } else {
                    var $mWidget = $(mWidget);
                    var pos = $mWidget.position();
                    var x = pos.left + moveX;
                    var y = pos.top + moveY;
                    $mWidget.css({left: x, top: y});
                    $('#widget_helper').css({left: x - 2, top: y - 2});
                }

                if ($('#allwidgets_helper').is(':visible')) {
                    var pos = $('#allwidgets_helper').position();
                    $('#allwidgets_helper').css({left: pos.left + moveX, top: pos.top + moveY});
                }*/
            }
        };
        if ($('#snap_type option:selected').val() == 1) {
            draggableOptions.snap = "#vis_container div.vis-widget";
        }
        if ($('#snap_type option:selected').val() == 2) {
            draggableOptions.grid = [vis.gridWidth, vis.gridWidth];
        }
        obj.draggable(draggableOptions);
    },
    resizable: function (obj) {
        var resizableOptions;
        var that = this;
        if (obj.attr('data-vis-resizable')) resizableOptions = JSON.parse(obj.attr('data-vis-resizable'));

        if (!resizableOptions) resizableOptions = {};

        if (resizableOptions.disabled !== true) {
            resizableOptions.disabled = false;
            obj.resizable($.extend({
                stop: function (event, ui) {
                    var widget = ui.helper.attr('id');

                    $('#inspect_css_width').val(ui.size.width + 'px');
                    $('#inspect_css_height').val(ui.size.height + 'px');

                    if (!that.views[that.activeView].widgets[widget].style) that.views[that.activeView].widgets[widget].style = {};

                    ui.size.width = ui.size.width.toFixed(0);
                    ui.size.height.top  = ui.size.height.toFixed(0);

                    that.views[that.activeView].widgets[widget].style.width  = ui.size.width;
                    that.views[that.activeView].widgets[widget].style.height = ui.size.height;
                    that.save();
                },
                resize: function (event, ui) {
                    $('.widget-helper').css({
                        width:  ui.element.outerWidth()  + 2,
                        height: ui.element.outerHeight() + 2});
                }
            }, resizableOptions));
        }
    },
    droppable: function (view) {
        var $view = $("#visview_" + view);
        var that = this;
        $view.droppable({
            accept: ".wid_prev",
            drop: function (event, ui) {
                var tpl = $(ui.draggable).data("tpl");
                var view_pos = $("#vis_container").position();
                var add_pos = {left: ui.position.left - $('#toolbox').width() + $("#vis_container").scrollLeft() +5, top: ui.position.top - view_pos.top +$("#vis_container").scrollTop()+8};

                var $tpl = $('#' + tpl);
                var renderVisible = $tpl.attr('data-vis-render-visible');

                // Widget attributs default values
                var attrs = $tpl.attr('data-vis-attrs');
                var data = {};
                if (attrs) {
                    attrs = attrs.split(';');
                    if (attrs.indexOf('oid') != -1) data.oid = 'nothing_selected';
                }
                if (renderVisible) data.renderVisible = true;

                var widgetId = that.addWidget(tpl, data, add_pos);

                that.$selectActiveWidgets.append('<option value="' + widgetId + '">' + that.getWidgetName(that.activeView, widgetId) + ')</option>')
                    .multiselect('refresh');

                setTimeout(function () {
                    that.inspectWidgets();
                }, 50);

            }
        });

    },
    // Find free place for new widget
    findFreePosition: function (view, id, field, widgetWidth, widgetHeight) {
        var editPos = $('.ui-dialog:first').position();
        field = $.extend({x: 0, y: 0, width: editPos.left}, field);
        widgetWidth = (widgetWidth || 60);
        widgetHeight = (widgetHeight || 60);

        if (widgetWidth > field.width) field.width = widgetWidth + 1;

        var step = 20;
        var y = field.y;
        var x = field.x || step;

        // Prepare coordinates
        var positions = [];
        for (var w in this.views[view].widgets) {
            if (w == id || !this.views[view].widgets[w].tpl) {
                continue;
            }

            if (this.views[view].widgets[w].tpl.indexOf('Image') == -1 &&
                this.views[view].widgets[w].tpl.indexOf('image') == -1) {
                var $jW = $('#' + w);
                if ($jW.length) {
                    var s = $jW.position();
                    s['width'] = $jW.width();
                    s['height'] = $jW.height();
                    if (s.width > 300 && s.height > 300) {
                        continue;
                    }
                    positions[positions.length] = s;
                }
            }
        }

        while (!this.checkPosition(positions, x, y, widgetWidth, widgetHeight)) {
            x += step;
            if (x + widgetWidth > field.x + field.width) {
                x = field.x;
                y += step;
            }
        }

        // No free place on the screen
        if (y >= $(window).height()) {
            x = 50;
            y = 50;
        }

        return {left: x, top: y};
    },
    // Check overlapping
    checkPosition: function (positions, x, y, widgetWidth, widgetHeight) {
        for (var i = 0; i < positions.length; i++) {
            var s = positions[i];

            if (((s.left <= x && (s.left + s.width) >= x) ||
                (s.left <= x + widgetWidth && (s.left + s.width) >= x + widgetWidth)) &&
                ((s.top <= y && (s.top + s.height) >= y) ||
                (s.top <= y + widgetHeight && (s.top + s.height) >= y + widgetHeight))) {
                return false;
            }
            if (((x <= s.left && s.left <= x + widgetWidth) ||
                (x <= (s.left + s.width) && (s.left + s.width) <= x + widgetWidth)) &&
                ((y <= s.top && s.top <= y + widgetHeight) ||
                (y <= (s.top + s.height) && (s.top + s.height) <= y + widgetHeight))) {
                return false;
            }
        }
        return true;
    },
    actionHighlighWidget: function (id) {
        if (id == "none") return;

        var $jWidget = $('#' + id);
        if (!$jWidget.length) return;

        var s = $jWidget.position();
        s['width']  = $jWidget.width();
        s['height'] = $jWidget.height();
        s['radius'] = parseInt($jWidget.css('border-radius'));

        var _css1 = {
            left: s.left - 3.5,
            top: s.top - 3.5,
            height: s.height,
            width: s.width,
            opacity: 1,
            borderRadius: 15
        };


        var text = "<div id='" + id + "__action1' style='z-index:2000; top:" + (s.top - 3.5) + "px; left:" + (s.left - 3.5) + "px; width: " + s.width + "px; height: " + s.height + "px; position: absolute'></div>";
        $('#visview_' + this.activeView).append(text);
        var _css2 = {
            left: s.left - 4 - s.width,
            top: s.top - 4 - s.height,
            height: s.height * 3,
            width: s.width * 3,
            opacity: 0,
            //borderWidth: 1,
            borderRadius: s['radius'] + (s.height > s.width) ? s.width : s.height
        };

        $('#' + id + '__action1').
            addClass('vis-show-new').
            css(_css2).
            animate(_css1, 1500, 'swing', function () {
                $(this).remove();
            }).click(function () {
                $(this).stop().remove();
            });

        text = text.replace('action1', 'action2');
        $('#visview_' + this.activeView).append(text);
        $('#' + id + '__action2').
            addClass('vis-show-new').
            css(_css2).
            animate(_css1, 3000, 'swing', function () {
                $(this).remove();
            });
    },
    // collect all filter keys for given view
    updateFilter: function () {
        if (this.activeView && this.views) {
            var widgets = this.views[this.activeView].widgets;
            this.views[this.activeView].filterList = [];

            for (var widget in widgets) {
                if (widgets[widget] && widgets[widget].data &&
                    widgets[widget].data.filterkey != '' &&
                    widgets[widget].data.filterkey !== undefined) {
                    var isFound = false;
                    for (var z = 0; z < this.views[this.activeView].filterList.length; z++) {
                        if (this.views[this.activeView].filterList[z] == widgets[widget].data.filterkey) {
                            isFound = true;
                            break;
                        }
                    }
                    if (!isFound) {
                        this.views[vis.activeView].filterList[this.views[this.activeView].filterList.length] = widgets[widget].data.filterkey;
                    }
                }
            }
            return this.views[this.activeView].filterList;
        } else {
            return [];
        }
    },
    initStealHandlers: function () {
        var that = this;
        $('.vis-steal-css').each(function () {
            $(this).button({
                icons: {
                    primary: "ui-icon-star"
                },
                text: false
            }).click(function (e) {
                if (!$(this).attr('checked')) {
                    $(this).attr('checked', true).button('refresh');
                } else {
                    $(this).removeAttr('checked').button('refresh');
                }
                var isSelected = false;
                $('.vis-steal-css').each(function () {
                    if ($(this).attr('checked')) {
                        isSelected = true;
                    }
                });

                if (isSelected && !that.isStealCss) {
                    that.stealCssMode();
                } else if (!isSelected && that.isStealCss) {
                    that.stealCssModeStop();
                }

                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        })
    },
    stealCssModeStop: function () {
        this.isStealCss = false;
        $('#stealmode_content').remove();
        if (this.selectable) {
            $('#visview_' + this.activeView).selectable('enable');
        }
        $('.vis-steal-css').removeAttr('checked').button('refresh');
        $('#vis_container').removeClass('vis-steal-cursor');

    },
    stealCssMode: function () {
        var that = this;
        if (this.selectable) $("#visview_" + this.activeView).selectable('disable');

        this.isStealCss = true;

        if (!$('#stealmode_content').length) {
            $('body').append('<div id="stealmode_content" style="display:none" class="vis-stealmode">CSS steal mode</div>')
            $('#stealmode_content').fadeIn('fast')
                .click(function () {
                    $(this).fadeOut('slow');
                });
        }

        $('.vis-widget').one('click', function (e) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();

            that.stealCss(e);
        });
        $('#vis_container').addClass('vis-steal-cursor');
    },
    stealCss: function (e) {
        if (this.isStealCss) {
            var that = this;
            var src  = "#" + e.currentTarget.id;

            $('.vis-steal-css').each(function () {
                if ($(this).attr('checked')) {
                    $(this).removeAttr('checked').button('refresh');
                    var cssAttribute = $(this).attr('data-vis-steal');
                    var val;
                    if (cssAttribute.match(/border-/) || cssAttribute.match(/padding/)) {
                        val = that.combineCssShorthand($(src), cssAttribute);
                    } else {
                        val = $(src).css(cssAttribute);
                    }
                    for (var i = 0; i < that.activeWidgets.length; i++) {
                        $('#' + that.activeWidgets[i]).css(cssAttribute, val);
                        that.views[that.activeView].widgets[that.activeWidgets[i]].style[cssAttribute] = val;
                        that.showWidgetHelper(that.activeWidgets[i], true);
                    }
                }
            });

            this.save(function () {
                that.stealCssModeStop();
                that.inspectWidgets();
            });
        }
    },
    combineCssShorthand: function (that, attr) {
        var css;
        var parts = attr.split('-');
        var baseAttr = parts[0];

        if (attr == "border-radius") {
            // TODO second attribute
            var cssTop = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-top-left"));
            var cssRight = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-top-right"));
            var cssBottom = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-bottom-right"));
            var cssLeft = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-bottom-left"));
        } else {
            var cssTop = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-top"));
            var cssRight = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-right"));
            var cssBottom = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-bottom"));
            var cssLeft = that.css(attr.replace(RegExp(baseAttr), baseAttr + "-left"));
        }
        if (cssLeft == cssRight && cssLeft == cssTop && cssLeft == cssBottom) {
            css = cssLeft;
        } else if (cssTop == cssBottom && cssRight == cssLeft) {
            css = cssTop + ' ' + cssLeft;
        } else if (cssRight == cssLeft) {
            css = cssTop + ' ' + cssLeft + ' ' + cssBottom;
        } else {
            css = cssTop + ' ' + cssRight + ' ' + cssBottom + ' ' + cssLeft;
        }
        return css;
    },
    _saveTimer: null, // Timeout to save the configuration
    _saveToServer: function () {
        if (!vis.undoHistory || vis.undoHistory.length == 0 ||
            (JSON.stringify(vis.views[vis.activeView]) != JSON.stringify(vis.undoHistory[vis.undoHistory.length - 1]))) {
            vis.undoHistory = vis.undoHistory || [];
            $('#button_undo').removeClass('ui-state-disabled');
            if (vis.undoHistory.push($.extend(true, {}, vis.views[vis.activeView])) > vis.undoHistoryMaxLength) {
                vis.undoHistory.splice(0, 1);
            }
        }

        vis.saveRemote(function () {
            vis._saveTimer = null;
            $('#saving_progress').hide();
        });
    },
    save: function (cb) {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        var that = this;
        // Store the changes if nothing changed for 2 seconds
        this._saveTimer = setTimeout(function () {
            that._saveToServer();
        }, 2000);

        $('#saving_progress').show();
        if (cb) cb();
    },
    undo: function () {
        if (this.undoHistory.length <= 1) return;

        var activeWidgets = this.activeWidgets;

        this.inspectWidgets([]);
        $('#visview_' + this.activeView).remove();

        this.undoHistory.pop();
        this.views[this.activeView] = $.extend(true, {}, this.undoHistory[this.undoHistory.length - 1]);
        this.saveRemote();

        if (this.undoHistory.length <= 1) {
            $('#button_undo').addClass('ui-state-disabled').removeClass('ui-state-hover');
        }

        this.renderView(this.activeView);
        this.changeViewEdit(this.activeView, true);
        this.inspectWidgets(activeWidgets);
    },
    getWidgetThumbnail: function (widget, maxWidth, maxHeight, callback) {
        var widObj = document.getElementById(widget);
        if (!widObj || !callback) {
            return;
        }
        maxWidth = maxWidth || 200;
        maxHeight = maxHeight || 40;

        if (!widObj.innerHTML || widObj.innerHTML.length > 20000) {
            var $elem = $(widObj);
            var newCanvas = document.createElement('canvas');
            newCanvas.height = maxHeight;
            newCanvas.width = Math.ceil($elem.width() / $elem.height() * newCanvas.height);
            if (newCanvas.width > maxWidth) {
                newCanvas.width = maxWidth;
                newCanvas.height = Math.ceil($elem.height / $elem.width * newCanvas.width);
            }

            var ctx = newCanvas.getContext('2d');
            ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
            ctx.fillStyle = "#FF0000";
            ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            ctx.font = "5px Arial";
            ctx.fillText('Cannot render', 0, 0);
            callback(newCanvas);
        } else {
            html2canvas(widObj, {
                onrendered: function (canvas) {
                    var newCanvas = document.createElement('canvas');
                    newCanvas.height = maxHeight;
                    newCanvas.width = Math.ceil(canvas.width / canvas.height * newCanvas.height);
                    if (newCanvas.width > maxWidth) {
                        newCanvas.width = maxWidth;
                        newCanvas.height = Math.ceil(canvas.height / canvas.width * newCanvas.width);
                    }
                    var ctx = newCanvas.getContext('2d');
                    ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
                    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
                    callback(newCanvas);
                }
            });
        }
    },
    showHint: function (content, life, type, onShow) {
        if (!$.jGrowl) {
            this.showMessage(content);
            return;
        }
        if (!this.growlInited) {
            this.growlInited = true;
            // Init jGrowl
            $.jGrowl.defaults.closer = true;
            $.jGrowl.defaults.check = 1000;
        }

        $('#growl_informator').jGrowl(content, {
            theme: type,
            life: (life === undefined) ? 10000 : life,
            sticky: (life === undefined) ? false : !life,
            afterOpen: function (e, m, o) {
                e.click(function () {
                    $(this).find('.jGrowl-close').trigger('jGrowl.close');
                });
                if (onShow) {
                    onShow(content);
                }
            }
        });
    },
    selectAll: function () {
        // Select all widgets on view
        var $focused = $(':focus');
        if (!$focused.length && this.activeView) {
            var newWidgets = [];
            // Go through all widgets
            for (var widget in this.views[this.activeView].widgets) {
                newWidgets.push(widget);
            }
            this.inspectWidgets(newWidgets);
            return true;
        } else {
            return false;
        }
    },
    deselectAll: function () {
        // Select all widgets on view
        var $focused = $(':focus');
        if (!$focused.length && vis.activeView) {
            this.inspectWidgets([]);
            return true;
        } else {
            return false;
        }
    },
    paste: function () {
        var $focused = $(':focus');
        if (!$focused.length) {
            if (this.clipboard && this.clipboard.length) {
                var widgets = [];
                this.dupWidgets(this.clipboard);
                this.save();                // Select main widget and add to selection the secondary ones
                this.inspectWidgets();
            }
        }
    },
    copy: function (isCut) {
        var $focused = $(':focus');
        if (!$focused.length && this.activeWidgets.length) {
            var $clipboard_content = $('#clipboard_content');
            if (!$clipboard_content.length) {
                $('body').append('<div id="clipboard_content" style="display:none" class="vis-clipboard" title="' + _('Click to hide') + '"></div>');
                $clipboard_content = $('#clipboard_content');
            }

            this.clipboard = [];
            var widgetNames = '';
            if (this.activeWidgets.length) {
                for (var i = 0, len = this.activeWidgets.length; i < len; i++) {
                    widgetNames += ', ' + this.activeWidgets[i];
                    this.clipboard.push({
                        widget: $.extend(true, {}, this.views[this.activeView].widgets[this.activeWidgets[i]]),
                        view: (!isCut) ? this.activeView : '---copied---'
                    });
                }
            }

            /* this.showHint('<table><tr><td>' + _('Clipboard:') + '&nbsp;<b>' + widgetNames + '</b></td><td id="thumbnail" width="200px"></td></tr></table>', 0, null, function () {
             if (html2canvas) {
             this.getWidgetThumbnail(this.activeWidget, 0, 0, function (canvas) {
             $('#thumbnail').html(canvas);
             });
             }

             });
             */
            $clipboard_content.html('<table><tr><td>' + _('Clipboard:') + '&nbsp;<b>' + widgetNames + '</b></td><td id="thumbnail"></td></tr></table>');

            var that = this;
            if (typeof html2canvas != "undefined") {
                this.getWidgetThumbnail(this.activeWidgets[0], 0, 0, function (canvas) {
                    $('#thumbnail').html(canvas);
                    if (isCut) {
                        that.delWidgets();
                        that.inspectWidgets([]);
                    }
                });
            } else {
                if (isCut) {
                    this.delWidgets();
                    this.inspectWidgets([]);
                }
            }

            $clipboard_content.css({left: ($(document).width() - $clipboard_content.width()) / 2})
                .click(function () {
                    $(this).slideUp('slow');
                })
                .fadeIn('fast');
        } else {
            $('#clipboard_content').remove();
        }
    },
    onButtonDelete: function () {
        var $focused = $(':focus');
        if (!$focused.length && this.activeWidgets.length) {
            var isHideDialog = false;
            if (typeof storage != "undefined") {
                isHideDialog = storage.get('dialog_delete_is_show');
            }

            if (!isHideDialog) {
                if (this.activeWidgets.length > 1) {
                    $('#dialog_delete_content').html(_('Do you want delete %s widgets?', this.activeWidgets.length + 1));
                } else {
                    $('#dialog_delete_content').html(_('Do you want delete widget %s?', this.activeWidgets[0]));
                }

                var dialog_buttons = {};

                var delText = _('Delete').replace('&ouml;', 'ö');
                var that = this;
                dialog_buttons[delText] = function () {
                    if ($('#dialog_delete_is_show').prop('checked')) {
                        if (typeof storage != "undefined") {
                            storage.set('dialog_delete_is_show', true);
                        }
                    }
                    $(this).dialog('close');
                    that.delWidgets();
                    that.inspectWidgets([]);
                }
                dialog_buttons[_('Cancel')] = function () {
                    $(this).dialog('close');
                };

                $('#dialog_delete').dialog({
                    autoOpen: true,
                    width:    500,
                    height:   220,
                    modal:    true,
                    title:    _('Confirm widget deletion'),
                    open:    function (event, ui) {
                        $('[aria-describedby="dialog_delete"]').css('z-index', 1002);
                        $('.ui-widget-overlay').css('z-index', 1001);
                    },
                    buttons: dialog_buttons
                });
            } else {
                this.delWidgets();
                this.inspectWidgets([]);
            }
            return true;
        } else {
            return false;
        }
    },
    onButtonArrows: function (key, isSize, factor) {
        factor = factor || 1;
        var $focused = $(':focus');
        if (!$focused.length && this.activeWidgets.lenght) {
            var what = null;
            var shift = 0;
            if (isSize) {
                if (key == 39) {
                    //Right
                    what = "width";
                    shift = 1;
                } else if (key == 37) {
                    // Left
                    what = "width";
                    shift = -1;
                } else if (key == 40) {
                    // Down
                    what = "height";
                    shift = 1;
                } else if (key == 38) {
                    // Up
                    what = "height";
                    shift = -1;
                }
            } else {
                if (key == 39) {
                    //Right
                    what = 'left';
                    shift = 1;
                } else if (key == 37) {
                    // Left
                    what = 'left';
                    shift = -1;
                } else if (key == 40) {
                    // Down
                    what = 'top';
                    shift = 1;
                } else if (key == 38) {
                    // Up
                    what = 'top';
                    shift = -1;
                }
            }

            shift = shift * factor;

            for (var i = 0, len = this.activeWidgets.length; i < len; i++) {
                var widgetId = this.activeWidgets[i]
                var $actualWidget = $('#' + widgetId);
                if (this.views[this.activeView].widgets[widgetId].style[what] === undefined && $actualWidget.length) {
                    this.views[this.activeView].widgets[widgetId].style[what] = $actualWidget.css(what);
                }

                this.views[this.activeView].widgets[widgetId].style[what] = parseInt(this.views[this.activeView].widgets[widgetId].style[what], 10) + shift;

                if ($actualWidget.length) {
                    var setCss = {};
                    setCss[what] = this.views[this.activeView].widgets[widgetId].style[what];
                    $actualWidget.css(setCss);
                    this.showWidgetHelper(widgetId, true);
                }
            }

            if (this.delayedSettings) clearTimeout(this.delayedSettings);

            var that = this;
            this.delayedSettings = setTimeout(function () {
                // Save new settings
                var activeWidgets = that.activeWidgets;
                that.activeWidgets = [];
                for (var i = 0, len = activeWidgets.length; i < len; i++) {
                    var mWidget = document.getElementById(activeWidgets[i]);

                    if ((what == 'top' || what == 'left') && mWidget._customHandlers && mWidget._customHandlers.onMoveEnd) {
                        mWidget._customHandlers.onMoveEnd(mWidget, activeWidgets[i]);
                    } else if (mWidget._customHandlers && mWidget._customHandlers.onCssEdit) {
                        mWidget._customHandlers.onCssEdit(mWidget, activeWidgets[i]);
                    }

                    if (mWidget._customHandlers && mWidget._customHandlers.isRerender) that.reRenderWidgetEdit(activeWidgets[i]);
                }
                that.delayedSettings = null;
                that.inspectWidgets(true);
            }, 1000);

            this.save();

            return true;
        } else {
            return false;
        }
    },
    onPageClosing: function () {
        // If not saved
        if (this._saveTimer) {
            if (confirm(_('Changes are not saved. Are you sure?'))) {
                return null;
            } else {
                return "Configuration not saved.";
            }
        }
        return null;
    },
    get_panel_by_id: function (id) {
        var panels = dockManager.getPanels()
        var panel;
        $.each(panels, function () {
            if (this.elementContent.id == id) {
                panel = this;
                return false
            }
        });
        return panel
    }
});

$(document).keydown(function (e) {
    //                          Keycodes
    //
    // | backspace 	 8    |   e 	            69   |    numpad 8          104
    // | tab 	     9    |   f 	            70   |    numpad 9          105
    // | enter 	     13   |   g 	            71   |    multiply          106
    // | shift 	     16   |   h 	            72   |    add           	107
    // | ctrl 	     17   |   i 	            73   |    subtract          109
    // | alt 	     18   |   j 	            74   |    decimal point     110
    // | pause/break 19   |   k 	            75   |    divide            111
    // | caps lock 	 20   |   l 	            76   |    f1            	112
    // | escape 	 27   |   m 	            77   |    f2            	113
    // | page up 	 33   |   n 	            78   |    f3            	114
    // | page down 	 34   |   o 	            79   |    f4            	115
    // | end 	     35   |   p 	            80   |    f5            	116
    // | home 	     36   |   q 	            81   |    f6            	117
    // | left arrow  37   |   r 	            82   |    f7            	118
    // | up arrow 	 38   |   s 	            83   |    f8            	119
    // | right arrow 39   |   t	                84   |    f9            	120
    // | down arrow  40   |   u 	            85   |    f10           	121
    // | insert 	 45   |   v 	            86   |    f11           	122
    // | delete 	 46   |   w 	            87   |    f12           	123
    // | 0 	         48   |   x 	            88   |    num lock          144
    // | 1 	         49   |   y 	            89   |    scroll lock      	145
    // | 2 	         50   |   z 	            90   |    semi-colon       	186
    // | 3 	         51   |   left window key   91   |    equal sign       	187
    // | 4 	         52   |   right window key  92   |    comma             188
    // | 5 	         53   |   select key 	    93   |    dash          	189
    // | 6 	         54   |   numpad 0 	        96   |    period            190
    // | 7 	         55   |   numpad 1 	        97   |    forward slash     191
    // | 8 	         56   |   numpad 2 	        98   |    grave accent      192
    // | 9 	         57   |   numpad 3 	        99   |    open bracket      219
    // | a 	         65   |   numpad 4 	        100  |    back slash        220
    // | b 	         66   |   numpad 5 	        101  |    close braket      221
    // | c 	         67   |   numpad 6 	        102  |    single quote 	    222
    // | d 	         68   |   numpad 7 	        103  |

    // Capture ctrl-z (Windows/Linux) and cmd-z (MacOSX)
    if (e.which === 90 && (e.ctrlKey || e.metaKey)) {
        vis.undo();
        e.preventDefault();
    } else if (e.which === 65 && (e.ctrlKey || e.metaKey)) {
        // Ctrl+A
        if (vis.selectAll()) {
            e.preventDefault();
        }
    } else if (e.which === 27) {
        // Esc
        if (vis.deselectAll()) {
            e.preventDefault();
        }
    } else if (e.which === 46) {
        // Capture Delete button
        if (vis.onButtonDelete()) {
            e.preventDefault();
        }
    } else if (e.which === 37 || e.which === 38 || e.which === 40 || e.which === 39) {
        // Capture down, up, left, right for shift
        if (vis.onButtonArrows(e.which, e.shiftKey, (e.ctrlKey || e.metaKey ? 10 : 1))) {
            e.preventDefault();
        }
    } else if (e.which === 113) {
        $('#ribbon_tab_dev').toggle();
        e.preventDefault();
    } else if (e.which === 114) {
        // Fullscreen
        var $container = $('#vis_container');
        if ($container.hasClass('fullscreen')) {
            $container.removeClass('fullscreen').appendTo('#vis_wrap');
        } else {
            $container.prependTo('body').addClass('fullscreen')
        }
        e.preventDefault();
    } else if (e.which === 33) {
        // Next View
        vis.nextView();

        e.preventDefault();
    }
    if (e.which === 34) {
        // Prev View
        vis.prevView();
        e.preventDefault();
    }
});

// Copy paste mechanism
$(window).on('paste', function (e) {
    vis.paste();
}).on('copy cut', function (e) {
    vis.copy(e.type == "cut");
});

window.onbeforeunload = function () {
    return vis.onPageClosing();
};

