export type CategoryItem = {
  id: string;
  name: string;
  color: string;
};

export type EventItem = {
  id: string;
  title: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  category: CategoryItem;
  createdBy: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
};
