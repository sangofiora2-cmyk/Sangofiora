module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('images');
  eleventyConfig.addPassthroughCopy({ 'src/images': 'images' });
  eleventyConfig.addPassthroughCopy('admin');
  eleventyConfig.ignores.add('layouts/**');
  eleventyConfig.ignores.add('scripts/**');
  eleventyConfig.ignores.add('_xlsx-media/**');
  eleventyConfig.ignores.add('stitch_assets/**');
  eleventyConfig.ignores.add('.agents/**');
  eleventyConfig.ignores.add('agent/**');
  eleventyConfig.ignores.add('data/**');
  eleventyConfig.ignores.add('.claude/**');
  eleventyConfig.addNunjucksFilter('json', function(v) { return JSON.stringify(v); });

  eleventyConfig.addNunjucksFilter('related', function(products, category, slug) {
    return (products || []).filter(function(p) {
      return p.category === category && p.slug !== slug;
    }).slice(0, 4);
  });

  eleventyConfig.addNunjucksFilter('bestsellers', function(products, n) {
    return (products || []).slice().sort(function(a, b) {
      return b.reviews - a.reviews;
    }).slice(0, n || 8);
  });

  eleventyConfig.addNunjucksFilter('byCategory', function(products, category) {
    return (products || []).filter(function(p) {
      return p.category === category;
    });
  });

  return {
    dir: {
      input: '.',
      output: '_site',
      data: '_data',
      layouts: 'layouts',
      includes: 'partials'
    },
    templateFormats: ['html', 'md', 'json', 'njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
