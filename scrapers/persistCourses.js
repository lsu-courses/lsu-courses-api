const Course = require("../models/course");
const Section = require("../models/section");
const TimeInterval = require("../models/time-interval");
const Instructor = require("../models/instructor");
const InstructorsIntervals = require("../models/instructors-intervals");

const persist = departments => {
  console.log(`\nPersisting courses...`)

  departments.forEach(sections => {
    let courseBuffer = [];
    let courseCreatePromises = [];

    sections.forEach(section => {
      const {
        course: {
          abbreviation,
          number,
          hours,
          comments,
          special,
          full_title,
          description
        }
      } = section;

      if (!courseBuffer.includes(number)) {
        courseCreatePromises.push(
          new Promise((resolve, reject) => {
            resolve(
              Course.create({
                abbreviation,
                number,
                hours,
                full_title,
                description,
                comments: comments
              })
            );
          })
        );

        courseBuffer.push(number);
      }
    });

    Promise.all(courseCreatePromises) // 1. Create all courses for this department
      // 2. Map to attributes. Creating courses returns an array of their final
      // models. The models contaian a attributes object that contains their "ID"
      // in the database. We map the array such that it is now an array of those
      // attribute objects.
      .then(data => data.map(object => object.attributes))
      // 3. Create promises that create sections. Each course can have one or more
      // sections. In the database, sections have the course ID of their parent.
      // To find which parent ID goes with the section currently being processed,
      // we search the array of course attributes to find the course attribute
      // object that has the same abbreviation and number. We then use this course
      // attribute object's ID when creating the child section.
      .then(courses => {
        let createSectionPromises = [];

        sections.forEach(section => {
          const {
            available,
            current,
            is_full,
            total
          } = section.section.enrollment;

          // 3.1 Search for matching course, extract its ID
          const { id } = courses.find(
            course =>
              course.abbreviation === section.course.abbreviation &&
              course.number === section.course.number
          );

          // 3.2 Create promies that create sections with the matching ID
          createSectionPromises.push(
            new Promise((resolve, reject) => {
              Section.create({
                course_id: id,
                number: section.section.intervals[0].number,
                title: section.section.intervals[0].title,
                enrollment_available: available,
                enrollment_current: current,
                enrollment_is_full: is_full,
                enrollment_total: total
              }).then(object => {
                // We will later use this ID to make relations to time intervals in the DB. // with the full section object, which now has the section database ID. // of time intervals) and then we resolve this section creation promise // ID to the full section object (which contains things like an array // created section's ID in the database. We then attach this database // 3.2.1 The create method returns an object that contains the newly
                section.section_id = object.attributes.id;
                resolve(section);
              });
            })
          );
        });

        // 3.3 Return the array of promises
        return createSectionPromises;
      })
      // 4. Create all sections
      .then(sectionPromises => Promise.all(sectionPromises))
      .then(sections => {
        let createTimeIntervalPromises = [];

        sections.forEach(section => {
          const { section_id, section: { intervals } } = section;

          intervals.forEach(interval => {
            createTimeIntervalPromises.push(
              new Promise((resolve, reject) => {
                // "Special" information on a time interval
                // are things that are determined and help
                // provide context.

                const special = interval.special.info;

                TimeInterval.create({
                  start: interval.time.start,
                  end: interval.time.end,
                  has_time: interval.time.hasTime,
                  location_building: interval.location.building,
                  location_room: interval.location.room,
                  days: interval.time.days,
                  comments: interval.comments,
                  is_lab: interval.isLab,
                  section_id: section_id,
                  s_night: interval.time.isNight,

                  s_all_web: special.isAllWeb,
                  s_most_web: special.isMostWeb,
                  s_half_web: special.isHalfWeb,
                  s_some_web: special.isSomeWeb,

                  s_req_dept_perm: special.requiresDeptPerm,
                  s_req_inst_perm: special.requiresInstPerm,

                  s_majors_only: special.isMajorsOnly,

                  s_cmi: special.communicationIntensive.isIntensive,
                  s_cmi_written: special.communicationIntensive.type.written,
                  s_cmi_spoken: special.communicationIntensive.type.spoken,
                  s_cmi_tech: special.communicationIntensive.type.tech,
                  s_cmi_visual: special.communicationIntensive.type.visual,

                  s_svc: special.isServiceLearning
                }).then(object => {
                  interval.interval_id = object.id;
                  resolve(interval);
                });
              })
            );
          });
        });

        return createTimeIntervalPromises;
      })
      .then(intervalPromises => Promise.all(intervalPromises))
      .then(intervals => {
        // create map of teacher to id
        // save all disctinct teachers to the database
        // and then return a map of their name to their ID
        // in the saved database. Then feed that map into the next
        // thing (creation of instructor courses where that can read
        // the map)

        if (intervals.length < 1) return;

        let teachers = intervals
          .map(interval => interval.teachers)
          .reduce((p, c) => [...p, ...c]);

        let unique_teachers = [];

        teachers.forEach(t => {
          if (!unique_teachers.includes(t)) unique_teachers.push(t);
        });

        let createTeacherPromises = [];

        unique_teachers.forEach(teacher => {
          createTeacherPromises.push(
            new Promise((resolve, reject) => {
              Instructor.create({ name: teacher }).then(object =>
                resolve({ name: teacher, id: object.id }));
            })
          );
        });

        // This comment can be refactored out later. It was just me typing
        // thoughts as fast as possible after I had this idea.

        // Assign the promise.all to a variable, pass that into all the
        // merge-table creation promises, then the merge table creation promises
        // use then on this variable and only perform an action once this has
        // compelted. This lets every merge table creation promise have access
        // to the values. This works because of closures.
        let uniqueTeacherIds = Promise.all(createTeacherPromises);

        let createTeacherIntervalPromises = [];

        intervals.forEach(interval => {
          createTeacherIntervalPromises.push(
            new Promise((resolve, reject) => {
              uniqueTeacherIds.then(teachers => {
                let matched_teachers = interval.teachers.map(name =>
                  teachers.find(i => i.name === name));

                // create an entry in the interval-intrsuctor merge
                // table here for every interval and for every teacher.
                // A single entry is created for each sub teacher for each
                // interval. These may not have to be created in promises
                // since we are never really going to use their return value.

                matched_teachers.forEach(teacher => {
                  // What exactly is the model for a merge table?
                  // And how exactly does a merge table even work?
                  // I think I've got to watch some SQL videos
                  // Tomorrow. It is 4:15 AM

                  InstructorsIntervals.create({
                    instructor_id: teacher.id,
                    time_interval_id: interval.interval_id
                  });
                });
              });
            })
          );
        });

        return createTeacherIntervalPromises;
      })
      .then(promises => {
        if (promises === undefined) return;
        Promise.all(promises);
      })
      //.then(teachers => console.log("teachers"))
      .catch(err => {
        console.error(err);
      });
  });
};

module.exports = persist;
