const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const parser = new Parser();
const BookPost = require('../models/BookPost');

// RSS feeds - from News - Main project
const newsFeeds = [
  // Tech
  'https://techcrunch.com/feed/',
  'https://hnrss.org/frontpage',
  'https://www.theverge.com/rss/index.xml',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.wired.com/feed/rss',
  // News
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'https://www.theatlantic.com/feed/all/',
  'https://www.newyorker.com/feed/everything',
  'http://feeds.feedburner.com/nymag/intelligencer',
  // Culture
  'http://feeds.feedburner.com/nymag/fashion'
];

// Book blog posts are now loaded from the database

// Home page
router.get('/', async (req, res, next) => {
  try {
    // Fetch book posts from database
    const bookPostsFromDb = await BookPost.findAll();

    // Transform book posts to match the article format
    const bookPosts = bookPostsFromDb.map(post => ({
      title: post.title,
      subtitle: post.subtitle,
      publication_name: 'My Book Blog',
      published_date: post.published_date,
      url: `/books/${post.slug}`,
      image_url: post.image_url
    }));

    const articles = [];
    for (const url of newsFeeds) {
      try {
        const feed = await parser.parseURL(url);

        // Extract publication name from feed and clean it up
        let publicationName = feed.title || feed.link || 'Unknown';

        // Clean up feed titles like "NYT > Top Stories" to just "NYT"
        if (publicationName.includes('>')) {
          publicationName = publicationName.split('>')[0].trim();
        }
        if (publicationName.includes('-')) {
          publicationName = publicationName.split('-')[0].trim();
        }


        articles.push(...feed.items.map(item => ({
          ...item,
          feedTitle: publicationName
        })));
      } catch (error) {
        console.error(`Failed to fetch RSS feed: ${url}`, error.message);
      }
    }

    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    res.render('home', {
      title: 'Home',
      articles: articles.map(item => {
        let imageUrl = null;

        // Try multiple image extraction methods
        // 1. Enclosure (common in RSS)
        if (item.enclosure && item.enclosure.url) {
          imageUrl = item.enclosure.url;
        }
        // 2. Media content (RSS extensions)
        else if (item['media:content']) {
          const mc = item['media:content'];
          if (Array.isArray(mc)) {
            const img = mc.find(m => (m.$ && m.$.url) || m.url);
            if (img) {
              imageUrl = img.$.url || img.url;
            }
          } else if (mc.$ && mc.$.url) {
            imageUrl = mc.$.url;
          } else if (mc.url) {
            imageUrl = mc.url;
          }
        }
        // 3. Media thumbnail
        else if (item['media:thumbnail']) {
          const mt = item['media:thumbnail'];
          if (mt.$ && mt.$.url) {
            imageUrl = mt.$.url;
          } else if (mt.url) {
            imageUrl = mt.url;
          }
        }
        // 4. Content encoded
        else if (item['content:encoded']) {
          const imgMatch = item['content:encoded'].match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        // 5. Extract from content/description
        else if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        else if (item.description) {
          const imgMatch = item.description.match(/<img[^>]+src=["']([^"'>]+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          title: item.title,
          author: item.creator || item.author,
          publication_name: item.feedTitle || 'Unknown',
          published_date: item.pubDate,
          url: item.link,
          image_url: imageUrl
        };
      }),
      bookPosts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

