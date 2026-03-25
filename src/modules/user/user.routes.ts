import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/authorize.middleware";
import { Role } from "../../types/role";

const router = Router();

// 🔥 USER + ADMIN
router.get(
  "/profile",
  authenticate,
  authorize(Role.USER, Role.ADMIN),
  (req, res) => {
    res.json({
      message: "User profile",
      user: req.user,
    });
  }
);

// 🔥 ADMIN ONLY
router.get(
  "/all-users",
  authenticate,
  authorize(Role.ADMIN),
  (req, res) => {
    res.json({
      message: "All users (admin only)",
    });
  }
);

// 🔥 ADMIN DELETE USER
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  (req, res) => {
    res.json({
      message: `User ${req.params.id} deleted`,
    });
  }
);

export default router;