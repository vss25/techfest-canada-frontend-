import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageSquareOff } from "lucide-react";
import { useStore } from "../lib/store";
import { fetchPost, social } from "../lib/social";
import { Empty, Spinner, TopBar } from "../components/ui";
import PostCard from "../components/PostCard";

/* One post, from a notification or a mention link (iOS LinkedPostSheet). */

export default function PostPage() {
  const { id } = useParams();
  const s = useStore(social);
  const known = s.feed.find((p) => p.id === id);
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (known) return undefined;
    let alive = true;
    fetchPost(id).then((p) => { if (alive) setLoaded(p); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [id, known]);
  const post = known || loaded;
  return (
    <div className="page">
      <TopBar title="Post" />
      <main id="main" className="mt-16">
        {post ? <PostCard post={post} /> : failed ? <Empty icon={MessageSquareOff} title="This post isn't available">It may have been removed.</Empty> : <Spinner />}
      </main>
    </div>
  );
}
