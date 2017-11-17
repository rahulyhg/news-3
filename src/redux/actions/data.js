export const CATEGORY_UPDATED = 'CATEGORY_UPDATED';
export const ARTICLE_UPDATED = 'ARTICLE_UPDATED';
export const FAILURE_CHANGED = 'FAILURE_CHANGED';
export const LOADING_CHANGED = 'LOADING_CHANGED';
export const ARTICLE_FETCHED = 'ARTICLE_FETCHED';
export const CATEGORY_FETCHED = 'CATEGORY_FETCHED';

import { Debouncer } from '../node_modules/@polymer/polymer/lib/utils/debounce.js';

let textarea = document.createElement('textarea');

export const categoryUpdated = (category, offline, loading, attempts) => (dispatch) => {
  dispatch({
    type: CATEGORY_UPDATED,
    category
  });

  // Don't fail if we become offline but already have a cached version, or if there's
  // nothing to fetch, or if already loading.
  if ((offline && category && category.items) || !category || loading) {
    dispatch({
      type: FAILURE_CHANGED,
      failure: false
    });
  } else {
    fetch('data/' + category.name + '.json',
      (response) => {
        dispatch({
          type: CATEGORY_FETCHED,
          items: _parseCategoryItems(JSON.parse(response), category.name)
        });
      }, 1 /* attempts */, true /* isRaw */, dispatch);
  }
};

export const articleUpdated = (article, offline, loading) => (dispatch) => {
  dispatch({
    type: ARTICLE_UPDATED,
    article
  });

  // Don't fail if we become offline but already have a cached version, or if there's
  // nothing to fetch, or if already loading.
  if ((offline && article && article.html) || !article || loading) {
    dispatch({
      type: FAILURE_CHANGED,
      failure: false
    });
  } else {
    fetch('data/articles/' + article.id + '.html',
      (response) => {
          type: ARTICLE_FETCHED,
          html: _formatHTML(response)
        });
      }, 1 /* attempts */, true /* isRaw */, dispatch);
  }
};

export const failureChanged = (failure) => (dispatch) => {
  dispatch({
    type: FAILURE_CHANGED,
    failure
  });
};

export const loadingChanged = (loading) => (dispatch) => {
  dispatch({
    type: LOADING_CHANGED,
    failure
  });
};

function fetch(url, callback, attempts, isRaw, dispatch) {
  let xhr = new XMLHttpRequest();
  xhr.addEventListener('load', (e) => {
    dispatch({
      type: LOADING_CHANGED,
      loading: false
    });
    if (isRaw) {
      callback(e.target.responseText);
    } else {
      callback(JSON.parse(e.target.responseText));
    }
  });
  xhr.addEventListener('error', (e) => {
    // Flaky connections might fail fetching resources
    if (attempts > 1) {
      this._fetchDebouncer = Debouncer.debounce(this._fetchDebouncer,
        timeOut.after(200), fetch.bind(this, url, callback, attempts - 1, isRaw, dispatch));
    } else {
      dispatch({
        type: LOADING_CHANGED,
        loading: false
      });
      dispatch({
        type: FAILURE_CHANGED,
        loading: true
      });
    }
  });

  dispatch({
    type: LOADING_CHANGED,
    loading: true
  });
  dispatch({
    type: FAILURE_CHANGED,
    loading: false
  });
  xhr.open('GET', url);
  xhr.send();
}

function _parseCategoryItems(response, categoryName) {
  let items = [];
  for (let i = 0, item; item = response[i]; ++i) {
    items.push({
      headline: _unescapeText(item.title),
      href: _getItemHref(item, categoryName),
      id: item.id,
      imageUrl: _getItemImage(item),
      placeholder: item.placeholder,
      category: item.category,
      timeAgo: _timeAgo(new Date(item.time).getTime()),
      author: item.author,
      summary: _trimRight(item.summary, 100),
      readTime: Math.max(2, Math.round(item.contentLength / 3000)) + ' min read'
    });
  }
  return items;
}

function _formatHTML(html) {
  let template = document.createElement('template');
  template.innerHTML = html;

  // Remove h1, .kicker, and .date from content.
  // let h1 = template.content.querySelector('h1');
  // h1 && h1.remove();
  // let kicker = template.content.querySelector('.kicker');
  // kicker && kicker.remove();
  // let date = template.content.querySelector('.date');
  // date && date.remove();

  // Remove the first image if it's the same as the item image.
  // let image = template.content.querySelector('img');
  // if (image && this._isSameImageSrc(image.src, this.article.imageUrl)) {
  //   image.remove();
  // }

  // Remove width/height attributes from all images.
  let images = template.content.querySelectorAll('img');
  for (let i = 0; i < images.length; ++i) {
    let img = images[i];
    img.removeAttribute('width');
    img.removeAttribute('height');
  }
  return template.content.querySelector('.content').innerHTML;
}

function _unescapeText(text) {
  textarea.innerHTML = text;
  return textarea.textContent;
}

function _getItemHref(item, categoryName) {
  return item.id ? '/article/' + categoryName + '/' + encodeURIComponent(item.id) : null;
}

function _getItemImage(item) {
  return item.imgSrc ? 'data/' + item.imgSrc : '';
}

function _timeAgo(timestamp) {
  if (!timestamp)
    return ''

  let minutes = (Date.now() - timestamp) / 1000 / 60;
  if (minutes < 2)
    return '1 min ago';
  if (minutes < 60)
    return Math.floor(minutes) + ' mins ago';
  if (minutes < 120)
    return '1 hour ago';

  let hours = minutes / 60;
  if (hours < 24)
    return Math.floor(hours) + ' hours ago';
  if (hours < 48)
    return '1 day ago';

  return Math.floor(hours / 24) + ' days ago';
}

function _trimRight(text, maxLength) {
  let breakIdx = text.indexOf(' ', maxLength);
  return breakIdx === -1 ? text : text.substr(0, breakIdx) + '...';
}