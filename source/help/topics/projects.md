## Projects

In order to allow you to work on multiple CS games simultaneously, the IDE needs to be able to link and group each game's scenes together.
This is done by assigning each game to a project.

### What is a Project?

It's important to understand that projects only exist inside the IDE, there is no saved Project file nor is there any
method or function via which you can open a Project - you can only ever open scene files.

For the most part Project creation and assignment is handled automatically by the IDE.
Project assignment is based on filepath meaning that any files opened from within the same folder
will also be grouped under the same project. If a scene file is opened and there is no Project 
already open for that folder, the IDE will automatically create a new one and assign it to that Project instead.

### What do they do?

Projects help both the IDE and its users keep scenes and their respective games organised.
Without projects it would be hard - if not impossible - for both the program and the user to
tell which scenes belonged to which game. By grouping scenes into projects, the IDE knows
which scenes it's allowed to load during a run, which scenes to include in a word count, where to create new scene files for that game and much more.

