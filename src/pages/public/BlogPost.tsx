import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import { Calendar, User, Tag, ArrowLeft } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { sanityClient, urlFor } from '../../lib/sanityClient';
import { portableTextComponents } from '../../lib/portableTextComponents';
import { format } from 'date-fns';

const NAVY = '#1E2D4D';

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  coverImage?: any;
  body?: any[];
  author?: string;
  categories?: string[];
  publishedAt?: string;
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    sanityClient
      .fetch<Post>(
        `*[_type == "post" && slug.current == $slug][0] {
          _id,
          title,
          slug,
          excerpt,
          coverImage,
          body,
          author,
          categories,
          publishedAt
        }`,
        { slug }
      )
      .then((data) => {
        if (!data) setNotFound(true);
        else setPost(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-28 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-4 bg-[#1E2D4D]/8 rounded w-24" />
            <div className="h-8 bg-[#1E2D4D]/8 rounded w-3/4" />
            <div className="h-4 bg-[#1E2D4D]/8 rounded w-1/3" />
            <div className="aspect-[16/9] bg-[#1E2D4D]/8 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-[#1E2D4D]/8 rounded w-full" />
              <div className="h-4 bg-[#1E2D4D]/8 rounded w-5/6" />
              <div className="h-4 bg-[#1E2D4D]/8 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-28 pb-16 px-4 sm:px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4" style={{ color: NAVY }}>
            Post Not Found
          </h1>
          <p className="text-[#1E2D4D]/50 mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[#1E2D4D] hover:text-[#2A3F6B] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const ogImage = post.coverImage
    ? urlFor(post.coverImage).width(1200).height(630).auto('format').url()
    : undefined;

  return (
    <>
      <Helmet>
        <title>{post.title} | EvidLY Blog</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://getevidly.com/blog/${post.slug.current}`} />
        <meta property="og:title" content={post.title} />
        {post.excerpt && <meta property="og:description" content={post.excerpt} />}
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:url" content={`https://getevidly.com/blog/${post.slug.current}`} />
        <meta property="og:type" content="article" />
        {post.publishedAt && (
          <meta property="article:published_time" content={post.publishedAt} />
        )}
      </Helmet>

      <div className="min-h-screen bg-white">
        <Navigation />

        <article className="pt-28 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <Link
                to="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-[#1E2D4D] hover:text-[#2A3F6B] font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </nav>

            {/* Title */}
            <h1
              className="font-['Outfit'] text-3xl md:text-4xl font-bold mb-4"
              style={{ color: NAVY }}
            >
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#1E2D4D]/50 mb-6">
              {post.author && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
              )}
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                </span>
              )}
            </div>

            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[#1E2D4D]"
                  >
                    <Tag className="w-3 h-3" />
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Cover Image */}
            {post.coverImage && (
              <div className="mb-10 rounded-xl overflow-hidden">
                <img
                  src={urlFor(post.coverImage).width(960).auto('format').url()}
                  alt={post.coverImage.alt || post.title}
                  loading="lazy"
                  className="w-full"
                />
              </div>
            )}

            {/* Body */}
            {post.body && (
              <div className="max-w-none">
                <PortableText value={post.body} components={portableTextComponents} />
              </div>
            )}
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}
