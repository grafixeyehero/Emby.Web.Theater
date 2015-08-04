(function (globalScope) {

    function getAveragePrimaryImageAspectRatio(items) {

        var values = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var ratio = items[i].PrimaryImageAspectRatio || 0;

            if (!ratio) {
                continue;
            }

            values[values.length] = ratio;
        }

        if (!values.length) {
            return null;
        }

        // Use the median
        values.sort(function (a, b) { return a - b; });

        var half = Math.floor(values.length / 2);

        var result;

        if (values.length % 2)
            result = values[half];
        else
            result = (values[half - 1] + values[half]) / 2.0;

        // If really close to 2:3 (poster image), just return 2:3
        if (Math.abs(0.66666666667 - result) <= .15) {
            return 0.66666666667;
        }

        // If really close to 16:9 (episode image), just return 16:9
        if (Math.abs(1.777777778 - result) <= .2) {
            return 1.777777778;
        }

        // If really close to 1 (square image), just return 1
        if (Math.abs(1 - result) <= .15) {
            return 1;
        }

        // If really close to 4:3 (poster image), just return 2:3
        if (Math.abs(1.33333333333 - result) <= .15) {
            return 1.33333333333;
        }

        return result;
    }

    function getDisplayName(item, displayAsSpecial, includeParentInfo) {

        if (!item) {
            throw new Error("null item passed into getPosterViewDisplayName");
        }

        var name = item.EpisodeTitle || item.Name || '';

        if (item.Type == "TvChannel") {

            if (item.Number) {
                return item.Number + ' ' + name;
            }
            return name;
        }
        if (displayAsSpecial && item.Type == "Episode" && item.ParentIndexNumber == 0) {

            name = Globalize.translate('ValueSpecialEpisodeName', name);

        } else if (item.Type == "Episode" && item.IndexNumber != null && item.ParentIndexNumber != null) {

            var displayIndexNumber = item.IndexNumber;

            var number = "E" + displayIndexNumber;

            if (includeParentInfo !== false) {
                number = "S" + item.ParentIndexNumber + ", " + number;
            }

            if (item.IndexNumberEnd) {

                displayIndexNumber = item.IndexNumberEnd;
                number += "-" + displayIndexNumber;
            }

            name = number + " - " + name;

        }

        return name;
    }

    function setShapeHome(items, options) {

        var primaryImageAspectRatio = getAveragePrimaryImageAspectRatio(items) || 0;

        if (primaryImageAspectRatio && primaryImageAspectRatio < .85) {
            options.shape = 'portraitCard homePortraitCard';
            options.rows = 2;
            options.width = DefaultTheme.CardBuilder.homePortraitWidth;
        }
        else if (primaryImageAspectRatio && primaryImageAspectRatio > 1.34) {
            options.shape = 'backdropCard homebackdropCard';
            options.rows = 3;
            options.width = DefaultTheme.CardBuilder.homeThumbWidth;
        }
        else {
            options.shape = 'squareCard homeSquareCard';
            options.rows = 3;
            options.width = DefaultTheme.CardBuilder.homeSquareWidth;
        }
    }

    function buildCardsHtml(items, apiClient, options) {

        var className = 'card';

        if (options.shape == 'autoHome') {
            setShapeHome(items, options);
        }

        if (options.shape) {
            className += ' ' + options.shape;
        }

        if (options.block || options.rows) {
            className += ' block';
        }

        var html = '';
        var itemsInRow = 0;

        for (var i = 0, length = items.length; i < length; i++) {

            if (options.rows && itemsInRow == 0) {
                html += '<div class="cardColumn">';
            }

            var item = items[i];

            html += buildCard(item, apiClient, options, className);
            itemsInRow++;

            if (options.rows && itemsInRow >= options.rows) {
                itemsInRow = 0;
                html += '</div>';
            }
        }

        return html;
    }

    function getCardImageUrl(item, apiClient, options) {

        var width = options.width;
        var height = null;
        var primaryImageAspectRatio = getAveragePrimaryImageAspectRatio([item]);
        var forceName = false;
        var imgUrl = null;

        if (options.preferThumb && item.ImageTags && item.ImageTags.Thumb) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Thumb",
                maxWidth: width,
                tag: item.ImageTags.Thumb
            });

        } else if (options.preferBanner && item.ImageTags && item.ImageTags.Banner) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Banner",
                maxWidth: width,
                tag: item.ImageTags.Banner
            });

        } else if (options.preferThumb && item.SeriesThumbImageTag && options.inheritThumb !== false) {

            imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                type: "Thumb",
                maxWidth: width,
                tag: item.SeriesThumbImageTag
            });

        } else if (options.preferThumb && item.ParentThumbItemId && options.inheritThumb !== false) {

            imgUrl = apiClient.getThumbImageUrl(item.ParentThumbItemId, {
                type: "Thumb",
                maxWidth: width
            });

        } else if (options.preferThumb && item.BackdropImageTags && item.BackdropImageTags.length) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Backdrop",
                maxWidth: width,
                tag: item.BackdropImageTags[0]
            });

            forceName = true;

        } else if (item.ImageTags && item.ImageTags.Primary) {

            height = width && primaryImageAspectRatio ? Math.round(width / primaryImageAspectRatio) : null;

            imgUrl = apiClient.getImageUrl(item.Id, {
                type: "Primary",
                height: height,
                width: width,
                tag: item.ImageTags.Primary
            });

        }
        else if (item.ParentPrimaryImageTag) {

            imgUrl = apiClient.getImageUrl(item.ParentPrimaryImageItemId, {
                type: "Primary",
                width: width,
                tag: item.ParentPrimaryImageTag
            });
        }
        else if (item.AlbumId && item.AlbumPrimaryImageTag) {

            width = primaryImageAspectRatio ? Math.round(height * primaryImageAspectRatio) : null;

            imgUrl = apiClient.getScaledImageUrl(item.AlbumId, {
                type: "Primary",
                height: height,
                width: width,
                tag: item.AlbumPrimaryImageTag
            });

        }
        else if (item.Type == 'Season' && item.ImageTags && item.ImageTags.Thumb) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Thumb",
                maxWidth: width,
                tag: item.ImageTags.Thumb
            });

        }
        else if (item.BackdropImageTags && item.BackdropImageTags.length) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Backdrop",
                maxWidth: width,
                tag: item.BackdropImageTags[0]
            });

        } else if (item.ImageTags && item.ImageTags.Thumb) {

            imgUrl = apiClient.getScaledImageUrl(item.Id, {
                type: "Thumb",
                maxWidth: width,
                tag: item.ImageTags.Thumb
            });

        } else if (item.SeriesThumbImageTag) {

            imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                type: "Thumb",
                maxWidth: width,
                tag: item.SeriesThumbImageTag
            });

        } else if (item.ParentThumbItemId) {

            imgUrl = apiClient.getThumbImageUrl(item, {
                type: "Thumb",
                maxWidth: width
            });

        }

        return {
            imgUrl: imgUrl,
            forceName: forceName
        };
    }

    function enableProgressIndicator(item) {

        if (item.MediaType == 'Video' || item.Type == 'Series' || item.Type == 'Season' || item.Type == 'BoxSet' || item.Type == 'Playlist') {
            if (item.Type != 'TvChannel') {
                return true;
            }
        }

        return false;
    }

    function getProgressBarHtml(item) {

        if (enableProgressIndicator(item)) {
            if (item.Type == "Recording" && item.CompletionPercentage) {

                return '<paper-progress value="' + item.CompletionPercentage + '" class="block"></paper-progress>';
            }

            var userData = item.UserData;
            if (userData) {
                var pct = userData.PlayedPercentage;

                if (pct && pct < 100) {

                    return '<paper-progress value="' + pct + '" class="block"></paper-progress>';
                }
            }
        }

        return '';
    }

    function getCountIndicator(count) {

        return '<div class="cardCountIndicator">' + count + '</div>';
    }

    function buildCard(item, apiClient, options, className) {

        var imgInfo = getCardImageUrl(item, apiClient, options);
        var imgUrl = imgInfo.imgUrl;

        var cardImageContainerClass = 'cardImageContainer';
        if (options.coverImage) {
            cardImageContainerClass += ' coveredImage';
        }
        var cardImageContainer = imgUrl ? ('<div class="' + cardImageContainerClass + ' lazy" data-src="' + imgUrl + '">') : ('<div class="' + cardImageContainerClass + '">');

        if (options.showGroupCount && item.ChildCount && item.ChildCount > 1) {
            cardImageContainer += getCountIndicator(item.ChildCount);
        }

        var nameHtml = '';

        if (options.showParentTitle) {
            nameHtml += '<div class="cardText">' + (item.EpisodeTitle ? item.Name : (item.SeriesName || item.Album || item.AlbumArtist || item.GameSystem || "")) + '</div>';
        }

        nameHtml += options.showTitle || imgInfo.forceName ?
           ('<div class="cardText">' + getDisplayName(item) + '</div>') :
           '';

        nameHtml += getProgressBarHtml(item);

        var html = '\
<paper-button raised class="' + className + '"> \
<div class="cardScalable">\
<div class="cardPadder"></div>\
<div class="cardContent">\
' + cardImageContainer + '\
<div class="innerCardFooter">\
' + nameHtml + '\
</div>\
</div>\
</div>\
</div>\
</paper-button>'
        ;

        return html;
    }

    function isInDocument(card) {

        if (document.contains) {
            return document.contains(card);
        }
        return document.body.contains(card);
    }

    function buildCards(items, apiClient, options) {

        // Abort if the container has been disposed
        if (!isInDocument(options.parentContainer)) {
            return;
        }

        if (options.parentContainer) {
            if (items.length) {
                options.parentContainer.classList.remove('hide');
            } else {
                options.parentContainer.classList.add('hide');
                return;
            }
        }

        var html = buildCardsHtml(items, apiClient, options);

        options.itemsContainer.innerHTML = html;

        ImageLoader.lazyChildren(options.itemsContainer);
    }

    if (!globalScope.DefaultTheme) {
        globalScope.DefaultTheme = {};
    }

    globalScope.DefaultTheme.CardBuilder = {
        buildCardsHtml: buildCardsHtml,
        buildCards: buildCards,
        homeThumbWidth: 320,
        homePortraitWidth: 189,
        homeSquareWidth: 180
    };

})(this);