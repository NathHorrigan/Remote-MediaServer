"use strict";
/**
 * Created by owenray on 29-06-16.
 */

var IExtendedInfo = require("./IExtendedInfo");
var Promise = require("node-promise").Promise;
var MovieDB = require('moviedb')('0699a1db883cf76d71187d9b24c8dd8e');
var path = require('path');
var Database = require("../../Database");

var discardRegex = new RegExp('\\W|-|_|([0-9]+p)|(LKRG)', "g");

var lastRequest = 0;

class TheMovieDBExtendedInfo extends IExtendedInfo
{
    extendInfo(args, tryCount)
    {
        var mediaItem = args[0];
        var library = args[1];
        if(!tryCount)
        {
            tryCount = 0;
        }

        var promise = new Promise();

        if(mediaItem.attributes.gotExtendedInfo)
        {
            promise.resolve([mediaItem, library]);
            return promise;
        }

        var callback = function(err, res){
            if(!err&&res.results.length>0) {
                res = res.results[0];
                for (var key in res) {
                    mediaItem.attributes[key.replace(/_/g, "-")] = res[key];
                }
                var date = res["release_date"]?res["release_date"]:res["first_air_date"];
                mediaItem.attributes.year = date.split("-")[0];
                mediaItem.attributes.gotExtendedInfo = true;
                Database.update("media-item", mediaItem);
            }else if(tryCount<2){

                this.extendInfo([mediaItem, library], tryCount+1).then(promise.resolve);
                return;
            }
            promise.resolve([mediaItem, library]);
        }.bind(this);

        //If the movie cannot be found:
        // 1. try again without year,
        // 2. Then try again with the filename

        var params = {query:mediaItem.attributes.title};

        if(mediaItem.attributes.episode)
        {
            params.query+=" "+mediaItem.attributes.episode;
        }

        switch(tryCount)
        {
            case 0:
                params.year = mediaItem.attributes.year;
                break;
            case 2:
                params.query = path.parse(mediaItem.attributes.filepath).base.split(".")[0];
                params.query = params.query.replace(discardRegex, " ");
                break;
        }

        var searchMethod = MovieDB.searchMovie;
        switch(library.type)
        {
            case "tv":
                searchMethod = MovieDB.searchTv;
                break;
        }

        searchMethod = searchMethod.bind(MovieDB);
        function makeCall()
        {
            searchMethod(
                params,
                callback
            );
            lastRequest = new Date().getTime();
        }
        //to make sure the api only gets called every 300ms
        var waitFor = 300-(new Date().getTime()-lastRequest);
        if(waitFor<20)
        {
            //console.log("do not wait:", waitFor);
            makeCall();
        }else
        {
            //console.log("make call with delay:", waitFor);
            setTimeout(makeCall, waitFor);
        }
        return promise;
    }
}

module.exports = TheMovieDBExtendedInfo;