const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth} = require('../middleware/auth')

const router = express.Router();


// ToDo: überprüfen
router.get('/', canAuth, async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || "").trim();
    const sort = req.query.sort || null;
    const dir = (req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const authUserId = req.userId || null;

    // 🟦 1. Linktrees aus DB holen
    const trees = await prisma.linktree.findMany({
      where: {
        isPublic: true,
        OR: q
          ? [
              { title: { contains: q } },
              { interpret: { contains: q } },
              { album: { contains: q } },
              { owner: { nickname: { contains: q } } },
            ]
          : undefined,
      },
      include: {
        likes: true,
        comments: true,
        owner: true,
      },
    });

    // 🟩 2. Transformieren + relevance berechnen
    const result = trees.map(tree => {
      const likeCount = tree.likes.length;
      const commentCount = tree.comments.length;
      const clickCount = tree.clicks;

      // ⭐ Relevance Score
      // Gewichtung kannst du ändern wie du willst
      const relevance =
        likeCount * 3 +
        commentCount * 5 +
        clickCount * 0.5;

      return {
        id: tree.id,
        title: tree.title,
        interpret: tree.interpret,
        album: tree.album,
        description: tree.description,
        cover: tree.cover,
        releaseDate: new Date(tree.releaseDate).toISOString(),
        analytics: {
          clicks: clickCount,
          likes: {
            count: likeCount,
            liked: authUserId ? tree.likes.some(l => l.userId === authUserId) : false,
          },
          comments: commentCount,
          relevance: Number(relevance.toFixed(2)),
        },
        owner: {
          id: tree.owner.id,
          name: tree.owner.nickname,
          profileImg: {
            url: tree.owner.image || null,
            default: tree.owner.dummyProfileType.toLowerCase(),
          },
        },
        permissions: {
          canEdit: authUserId === tree.ownerId,
          canDelete: authUserId === tree.ownerId,
        },
      };
    });

    // 🟧 3. Sortierung anwenden
    if (sort === "likes") {
      result.sort((a, b) =>
        dir === "asc"
          ? a.analytics.likes.count - b.analytics.likes.count
          : b.analytics.likes.count - a.analytics.likes.count
      );
    } else if (sort === "comments") {
      result.sort((a, b) =>
        dir === "asc"
          ? a.analytics.comments - b.analytics.comments
          : b.analytics.comments - a.analytics.comments
      );
    } else if (sort === "clicks") {
      result.sort((a, b) =>
        dir === "asc"
          ? a.analytics.clicks - b.analytics.clicks
          : b.analytics.clicks - a.analytics.clicks
      );
    } else if (sort === "relevance") {
      result.sort((a, b) =>
        dir === "asc"
          ? a.analytics.relevance - b.analytics.relevance
          : b.analytics.relevance - a.analytics.relevance
      );
    }

    // 🟦 FINAL OUTPUT
    return res.status(200).json({ treelist: result });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Error." });
  }
});

module.exports = router;