/**
 * the document onload hooks
 *
 * Copyright (C) 2010-2011 Nikolay Nemshilov
 */
$(document).on({
  ready: function() {
    RR.hide_flash();
  },

  click: function(event) {
    RR.process_click(event);
  }
});