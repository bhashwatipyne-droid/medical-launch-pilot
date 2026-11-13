// "Task assigned to you" cards are for the people tasks are assigned to: team
// members, and managers who are assigned work themselves (a manager with nothing
// assigned sees no card). Admins and HR never see them. Set
// REACT_APP_TASK_CARDS_DISABLED=true to switch them off without a code change.
//
// PROTOTYPE (medical launch flow): off - task cards come from Planning, which
// the prototype does not have.
import { IS_PROTOTYPE } from "@/demo/demoMode";

export const showTaskCards = (user) =>
  !IS_PROTOTYPE &&
  (user?.role === "member" || user?.role === "manager") &&
  process.env.REACT_APP_TASK_CARDS_DISABLED !== "true";
