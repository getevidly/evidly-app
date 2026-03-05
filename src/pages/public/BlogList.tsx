import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, Tag } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { sanityClient, urlFor } from '../../lib/sanityClient';
import { format } from 'date-fns';

const NAVY = '#1E2D4D';

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  coverImage?: any;
  author?: string;
  categories?: string[];
  publishedAt?: string;
}

const POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  author,
  categories,
  publishedAt
}`;

function BlogCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/blog/${post.slug.current}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {post.coverImage && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={urlFor(post.coverImage).width(600).height(340).auto('format').url()}
            alt={post.coverImage.alt || post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5">
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e4d6b]"
              >
                <Tag className="w-3 h-3" />
                {cat}
              </span>
            ))}
          </div>
        )}

        <h2
          className="text-lg font-bold mb-2 group-hover:text-[#1e4d6b] transition-colors line-clamp-2"
          style={{ color: NAVY }}
        >
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {post.author && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {post.author}
            </span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function BlogList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sanityClient
      .fetch<Post[]>(POSTS_QUERY)
      .then((data) => setPosts(data || []))
      .catch(() => setError('Unable to load blog posts.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog | EvidLY</title>
        <meta
          name="description"
          content="Food safety compliance insights, tips, and industry news from EvidLY."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://getevidly.com/blog" />
        <meta property="og:title" content="Blog | EvidLY" />
        <meta
          property="og:description"
          content="Food safety compliance insights, tips, and industry news from EvidLY."
        />
        <meta property="og:url" content="https://getevidly.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-white">
        <Navigation />

        {/* Header */}
        <section className="pt-28 pb-12 px-4 sm:px-6 text-center">
          <h1
            className="font-['Outfit'] text-4xl md:text-5xl font-bold"
            style={{ color: NAVY }}
          >
            EvidLY Blog
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Food safety compliance insights, tips, and industry news.
          </p>
        </section>

        {/* Content */}
        <section className="pb-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[16/9] bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-gray-500">{error}</p>
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">No posts yet. Check back soon!</p>
              </div>
            )}

            {!loading && !error && posts.length > 0 && (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BlogCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
