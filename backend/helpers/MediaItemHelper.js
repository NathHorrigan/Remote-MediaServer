"use strict";

var Settings = require("../Settings");

class MediaItemHelper
{
    static getFullFilePath(mediaItem)
    {
        var libraries = Settings.getValue("libraries");
        var library;
        for(var key in libraries)
        {
            if(libraries[key].uuid==mediaItem.attributes.libraryId)
            {
                library = libraries[key];
            }
        }
        if(!library)
            return "";
        return library.folder+"/"+mediaItem.attributes.filepath;
    }
}

module.exports = MediaItemHelper;