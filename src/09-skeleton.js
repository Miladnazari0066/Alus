'use strict';

/** Replaces the given page element's content with a shimmering skeleton. */
function showSkeleton(page) {
  if (!page) return;
  page.innerHTML =
    '<div class="skeleton-wrap">' +
      '<div class="skel skel-hero"></div>' +
      '<div class="skel-grid"><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div></div>' +
      '<div class="skel skel-card" style="height:220px"></div>' +
      '<div style="margin-top:14px"><div class="skel skel-table-row"></div><div class="skel skel-table-row"></div><div class="skel skel-table-row"></div></div>' +
    '</div>';
}
