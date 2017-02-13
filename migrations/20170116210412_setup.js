exports.up = (knex, Promise) => {
  return Promise.all([
    knex.schema.createTable("semesters", table => {
      table.uuid("id").primary()

      table.string("title")
      table.boolean("archived")

      table.timestamps()
    }),

    knex.schema.createTable("courses", table => {
      table.uuid("id").primary()

      table.string("abbreviation")
      table.string("number")
      table.string("hours")

      table.unique(["abbreviation", "number"])

      table.string("specialEnrollment")
      table.boolean("isComIntensive")
      table.boolean("isWebBased")

      // Create PostgreSQL array field, of text
      table.specificType("comments", "text[]")

      table.uuid("semester_id").references("semesters.id")

      table.timestamps()
    }),

    knex.schema.createTable("instructors", table => {
      table.uuid("id").primary()

      table.string("name")

      table.timestamps()
    }),

    knex.schema.createTable("sections", table => {
      table.uuid("id").primary()

      table.string("number")
      table.string("title")
      table.string("enrollment_available")
      table.string("enrollment_current")
      table.string("enrollment_is_full")
      table.string("enrollment_total")

      table.uuid("course_id").references("courses.id")

      table.timestamps()
    }),

    knex.schema.createTable("instructors_intervals", table => {
      table.uuid("id").primary()

      table.uuid("instructor_id").references("instructors.id")
      table.uuid("interval_id").references("time_intervals.id")
      
      table.timestamps()
    }),

    knex.schema.createTable("time_intervals", table => {
      table.uuid("id").primary()

      table.string("start")
      table.string("end")
      table.boolean("hasTime")
      table.boolean("isNight")
      table.string("days")

      table.uuid("section_id").references("sections.id")

      table.timestamps()
    }),

    knex.schema.createTable("buildings", table => {
      table.uuid("id").primary()

      table.string("name")

      table.timestamps()
    }),

    knex.schema.createTable("sections_buildings", table => {
      table.uuid("section_id").references("sections.id")
      table.uuid("building_id").references("buildings.id")
    }),
  ])
}

exports.down = (knex, Promise) => {
  return Promise.all([
    knex.raw("DROP TABLE semesters CASCADE"),
    knex.raw("DROP TABLE courses CASCADE"),
    knex.raw("DROP TABLE instructors CASCADE"),
    knex.raw("DROP TABLE sections CASCADE"),
    knex.raw("DROP TABLE instructors_intervals CASCADE"),
    knex.raw("DROP TABLE time_intervals CASCADE"),
    knex.raw("DROP TABLE buildings CASCADE"),
    knex.raw("DROP TABLE sections_buildings CASCADE"),
  ])
}
