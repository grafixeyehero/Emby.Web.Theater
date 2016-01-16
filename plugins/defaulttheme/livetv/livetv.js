(function () {

    document.addEventListener("viewinit-defaulttheme-livetv", function (e) {

        new liveTVPage(e.target, e.detail.params);
    });

    function liveTVPage(view, params) {

        var self = this;

        view.addEventListener('viewshow', function (e) {

            require(['loading'], function (loading) {

                if (!self.tabbedPage) {
                    loading.show();
                    renderTabs(view, params.tab, self, params);
                }

                Emby.Page.setTitle(Globalize.translate('LiveTV'));
                Emby.Backdrop.clear();
            });
        });

        view.addEventListener('viewdestroy', function () {

            if (self.tabbedPage) {
                self.tabbedPage.destroy();
            }
        });
    }

    function renderTabs(view, initialTabId, pageInstance, params) {

        var tabs = [
        {
            Name: Globalize.translate('Channels'),
            Id: "channels"
        },
        {
            Name: Globalize.translate('Recordings'),
            Id: "recordings"
        },
        {
            Name: Globalize.translate('Scheduled'),
            Id: "scheduled"
        }];

        var tabbedPage = new DefaultTheme.TabbedPage(view);
        tabbedPage.loadViewContent = loadViewContent;
        tabbedPage.params = params;
        tabbedPage.renderTabs(tabs, initialTabId);
        pageInstance.tabbedPage = tabbedPage;
    }

    function loadViewContent(page, id, type) {

        var tabbedPage = this;

        return new Promise(function (resolve, reject) {

            if (self.listController) {
                self.listController.destroy();
            }

            var pageParams = tabbedPage.params;

            var autoFocus = false;

            if (!tabbedPage.hasLoaded) {
                autoFocus = true;
                tabbedPage.hasLoaded = true;
            }

            switch (id) {

                case 'channels':
                    renderChannels(page, pageParams, autoFocus, tabbedPage.bodySlyFrame, resolve);
                    break;
                case 'recordings':
                    renderRecordings(page, pageParams, autoFocus, tabbedPage.bodySlyFrame, resolve);
                    break;
                case 'scheduled':
                    break;
                default:
                    break;
            }
        });
    }

    function renderChannels(page, pageParams, autoFocus, slyFrame, resolve) {

        self.listController = new DefaultTheme.HorizontalList({

            itemsContainer: page.querySelector('.contentScrollSlider'),
            getItemsMethod: function (startIndex, limit) {
                return Emby.Models.liveTvChannels({
                    StartIndex: startIndex,
                    Limit: limit,
                    SortBy: "DateCreated,SortName",
                    SortOrder: "Descending"
                });
            },
            listCountElement: page.querySelector('.listCount'),
            listNumbersElement: page.querySelector('.listNumbers'),
            autoFocus: autoFocus,
            selectedItemInfoElement: page.querySelector('.selectedItemInfoInner'),
            selectedIndexElement: page.querySelector('.selectedIndex'),
            slyFrame: slyFrame,
            onRender: function () {
                if (resolve) {
                    resolve();
                    resolve = null;
                }
            }
        });

        self.listController.render();
    }

    function renderRecordings(page, pageParams, autoFocus, slyFrame, resolve) {

        self.listController = new DefaultTheme.HorizontalList({

            itemsContainer: page.querySelector('.contentScrollSlider'),
            getItemsMethod: function (startIndex, limit) {
                return Emby.Models.recordings({
                    StartIndex: startIndex,
                    Limit: limit,
                    SortBy: "DateCreated,SortName",
                    SortOrder: "Descending"
                });
            },
            listCountElement: page.querySelector('.listCount'),
            listNumbersElement: page.querySelector('.listNumbers'),
            autoFocus: autoFocus,
            selectedItemInfoElement: page.querySelector('.selectedItemInfoInner'),
            selectedIndexElement: page.querySelector('.selectedIndex'),
            slyFrame: slyFrame,
            onRender: function () {
                if (resolve) {
                    resolve();
                    resolve = null;
                }
            }
        });

        self.listController.render();
    }

})();