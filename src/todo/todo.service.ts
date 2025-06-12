import { Injectable } from "@nestjs/common";

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable()
export class TodoService {
  private todos: Todo[] = [];
  private nextId = 1;

  findAll(): Todo[] {
    return this.todos;
  }

  findOne(id: number): Todo | undefined {
    return this.todos.find((todo) => todo.id === id);
  }

  create(title: string): Todo {
    const todo: Todo = {
      id: this.nextId++,
      title,
      completed: false,
    };
    this.todos.push(todo);
    return todo;
  }

  update(id: number, title: string, completed: boolean): Todo | undefined {
    const todo = this.findOne(id);
    if (todo) {
      todo.title = title;
      todo.completed = completed;
    }
    return todo;
  }

  remove(id: number): boolean {
    const index = this.todos.findIndex((todo) => todo.id === id);
    if (index !== -1) {
      this.todos.splice(index, 1);
      return true;
    }
    return false;
  }
}
