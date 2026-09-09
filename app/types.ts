export type CategoryItem = {
  id: number;
  name: string;
  color: string;
};

export type EventItem = {
  id: number;
  title: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  category: CategoryItem;
  createdBy: {
    id: number;
    name: string;
    username: string;
    role: string;
  };
};
