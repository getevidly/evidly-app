-- =====================================================================
-- Migration: Seed CalCode 2026 citations from official PDF
-- Timestamp: 20260521200000
-- Sprint: Citations Architecture (CA Only) — Step 2B
--
-- 300 enforcement-relevant sections from California Health and Safety
-- Code Division 104 Part 7, effective January 1, 2026.
-- Chapters: 1, 3-9, 13. Excludes definitions (Ch 2) and
-- out-of-scope facility types (Ch 10-12).
-- =====================================================================

INSERT INTO citations (code_family, section_number, short_title, full_text, applies_to_pillar, current_edition_year, effective_date, source_url, metadata)
VALUES
  ('CalCode', '113700', 'California retail food code', 'These provisions shall be known, and may be cited, as the California
Retail Food Code, hereafter referred to as "this part."', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113703', 'Food safety, illness prevention, and honest presentation', 'The purpose of this part is to safeguard public health and provide to
CONSUMERs FOOD that is safe, unADULTERATED, and honestly presented
through adoption of science-based standards.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113705', 'Legislative intent to preempt local standards', 'The Legislature finds and declares that the public health interest requires
that there be uniform statewide health and sanitation standards for RETAIL FOOD
FACILITIES to assure the people of this state that the FOOD will be pure, safe,
and unADULTERATED. Except as provided in Section 113709, it is the intent of
the Legislature to occupy the whole field of health and sanitation standards for
RETAIL FOOD FACILITIES, and the standards set forth in this part and regulations
adopted pursuant to this part shall be exclusive of all local health and sanitation
standards relating to RETAIL FOOD FACILITIES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113707', 'Regulations', 'The DEPARTMENT shall adopt regulations to implement and administer
 this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113709', 'Authority to establish local requirements', 'This part does not prohibit a local governing body from adopting an
evaluation or grading system for FOOD FACILITIES, from prohibiting any type of
FOOD FACILITY, from adopting an EMPLOYEE health certification program, from
regulating the provision of CONSUMER toilet and handwashing facilities, from
adopting requirements for the public safety regulating the type of vending and the
time, place, and manner of vending from vehicles upon a street pursuant to its
authority under subdivision (b) of Section 22455 of the Vehicle Code, or from
prohibiting the presence of pet dogs in outdoor dining areas of food facilities.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113711', 'References to previous laws', 'In all LAWs and regulations, references to Chapter 4 (commencing with
Section 113700) or the California Uniform Retail Food Facilities Law, shall mean
this part or the California Retail Food Code.

                                                6', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113713', 'Primary responsibility for enforcement', '(a) Primary responsibility for enforcement of this part shall be with the local
            ENFORCEMENT AGENCY. Nothing in this part shall prevent the
            DEPARTMENT from taking any necessary program or enforcement
            actions for the protection of the public health and safety.

     (b) The DEPARTMENT shall provide technical assistance, training,
            standardization, program evaluation, and other services to local health
            agencies as necessary to ensure the uniform interpretation and
            application of this part, when an appropriation is made to the
            DEPARTMENT for this purpose.

     (c) Whenever the enforcement of the requirements of this part by any local
            ENFORCEMENT AGENCY is satisfactory to the DEPARTMENT, the
            enforcement of this part shall not be duplicated by the DEPARTMENT.
            The DEPARTMENT shall investigate to determine satisfactory
            enforcement of this part by evaluating the program of each local
            ENFORCEMENT AGENCY at least once every three years and shall
            prepare a report of the evaluation and list any program improvements
            needed only when an appropriation is made to the DEPARTMENT for
            these purposes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113715', 'Compliance with applicable codes', 'Any construction, alteration, REMODELing, or operation of a FOOD
FACILITY shall be APPROVED by the ENFORCEMENT AGENCY and shall be in
accordance with all applicable local, state, and federal statutes, regulations, and
ordinances, including but not limited to, fire, building, and zoning codes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113717', 'California Department of Health Services cost recovery', '(a) Any PERSON requesting the DEPARTMENT to undertake any activity
            pursuant to paragraph (5) of subdivision (c) of Section 113871,
            Section 114417, paragraph (2) of subdivision (b) of Section 114419, and
            Section 114419.3 shall pay the DEPARTMENT''s costs incurred in
            undertaking the activity. The DEPARTMENT''s services shall be assessed
            at the current hourly cost-recovery rate, and it shall be entitled to recover
            any other costs reasonably and actually incurred in performing those
            activities, including, but not limited to, the costs of additional inspection
            and laboratory testing. For purposes of this section, the DEPARTMENT''s
            hourly rate shall be adjusted annually in accordance with Section 100425.

     (b) The DEPARTMENT shall provide to the PERSON paying the required fee
            a statement, invoice, or similar document that describes in reasonable
            detail the costs paid.

     (c) For purposes of this section only, the term "PERSON" does not include
            any city, county, city and county, or other political subdivision of the state
            or local government.

                                                7', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113718', 'Retail food safety and defense fund', 'Notwithstanding Section 16350 of the Government Code, all moneys
deposited in the Retail Food Safety and Defense Fund shall be transferred to the
Food Safety Fund for appropriation and expenditure as specified by Section
110050.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113719', 'Structural and sanitation requirements', 'Structural and sanitation requirements shall be based on the FOOD
service activity to be conducted, the type of FOOD that is to be prepared or served,
and the extent of FOOD PREPARATION that is to be conducted at the FOOD
FACILITY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113725', 'Food facility inspection format', '(a) The ENFORCEMENT AGENCY shall utilize a standardized FOOD
            FACILITY inspection format for FOOD FACILITY inspections that
            includes all of the following:
                  (1) The name and address of the FOOD FACILITY.
                  (2) Identification of the following inspection criteria, which shall be
                        the basis of the inspection report:
                         (A) Improper holding temperatures of POTENTIALLY
                               HAZARDOUS FOODs.
                         (B) Improper cooling of POTENTIALLY HAZARDOUS
                               FOODs.
                         (C) Inadequate cooking of POTENTIALLY HAZARDOUS
                               FOODs.
                         (D) Poor personal hygiene of FOOD EMPLOYEEs.
                         (E) Contaminated EQUIPMENT.
                         (F) FOOD from unAPPROVED SOURCEs.
                  (3) For each violation identified pursuant to paragraph (2),
                        classification of the violation as a MINOR VIOLATION or
                        MAJOR VIOLATION.

     (b) An ENFORCEMENT AGENCY may modify the format to add criteria to
            those specified pursuant to paragraph (2) of subdivision (a), if both of the
            following conditions are met:
                 (1) The additional criteria are based on other provisions of this part.
                 (2) A violation is identified by reference to items and sections of this
                        part, or the regulations adopted pursuant to this part relating to
                        those items, if a FOOD FACILITY is cited for a violation of the
                        additional criteria.

     (c) This section shall not restrict the ability of the ENFORCEMENT AGENCY
            to inspect and report on criteria other than those subject to regulation
            under this part.

                                                8', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113725.1', 'Inspection report availability', 'A copy of the most recent routine inspection report conducted to assess
compliance with this part shall be maintained at the FOOD FACILITY and made
available upon request. The FOOD FACILITY shall post a notice advising
CONSUMERs that a copy of the most recent routine inspection report is
available for review by any interested party.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113725.2', 'Uniform statewide food inspection standardization', 'Local ENFORCEMENT AGENCIES, and the DEPARTMENT when
adequate funding is made available to the DEPARTMENT, shall conduct routine
training on FOOD FACILITY inspection standardization to promote the uniform
application of inspection procedures.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113725.3', 'Reporting procedures', '(a) The DEPARTMENT shall publish standardized procedures for
            enforcement agencies to report FOOD FACILITY inspection information
            regarding each FOOD FACILITY. The report shall include all of the
            following:
                  (1) Name and address of the FOOD FACILITY.
                  (2) Date of last inspection.
                  (3) Identification of any MAJOR VIOLATION identified in a FOOD
                        FACILITY inspection.
                  (4) Reinspection date, if applicable.
                  (5) Period of closure, if applicable.

     (b) The DEPARTMENT, in consultation with local environmental health
            directors, representatives of the RETAIL FOOD industry, and other
            interested parties, may periodically review and revise the standardized
            procedures established pursuant to subdivision (a). In making any
            revisions, the DEPARTMENT shall strive to ensure that the required
            information can be reported and made available in the most efficient,
            timely, and cost-effective manner.

     (c)
                  (1) The standardized procedures established pursuant to this
                        section shall include a standardized electronic format and
                        protocol for reporting the FOOD FACILITY inspection data in a
                        timely manner, and shall strive to ensure that the information is
                        readily accessible, can be rapidly reported, and, if necessary,
                        corrected, for each FOOD FACILITY that has been inspected or
                        reinspected. If the ENFORCEMENT AGENCY determines that
                        reported information is materially in error, that error shall be
                        corrected within 48 hours after that determination.
                  (2) The DEPARTMENT may establish standardized procedures for

                                                9
                        reporting the information on electronic media, including, but not
                        limited to, floppy disks or compact disks.
     (d) Within 60 days after the DEPARTMENT has established the standardized
            procedures pursuant to this section, the DEPARTMENT shall publish
            these procedures.
     (e)
                  (1) Each ENFORCEMENT AGENCY that reports FOOD FACILITY
                        inspection information on an Internet Web site shall report the
                        information in accordance with the standardized procedures
                        established pursuant to this section.
                 (2) This section shall not restrict the ability of an ENFORCEMENT
                        AGENCY to report on matters other than matters subject to
                        regulation under this part.
      (f) The DEPARTMENT may establish a link to each Internet Web site utilized
          by any ENFORCEMENT AGENCY containing the FOOD FACILITY
          inspection information pursuant to subdivision (e).', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "1", "chapter_title": "General Provisions"}'::jsonb),
  ('CalCode', '113945', 'Assignment', 'The PERMIT HOLDER shall be the PERSON IN CHARGE or shall
designate a PERSON IN CHARGE and shall ensure that a PERSON IN CHARGE
is present at the FOOD FACILITY during all hours of operation.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "1", "article_title": "Supervision"}'::jsonb),
  ('CalCode', '113945.1', 'Person in charge', 'The PERSON IN CHARGE shall ensure both of the following:
      (a) Except as specified in Section 113984.1, the PERSON IN CHARGE shall

            ensure that PERSONs unnecessary to the FOOD FACILITY operation
            shall not be allowed in the FOOD PREPARATION, FOOD storage, or
            WAREWASHING areas.
      (b) CONSUMERs are notified that clean TABLEWARE is to be used when
            they return to self-service areas, such as salad bars and buffets, as
            specified in Section 114075.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "1", "article_title": "Supervision"}'::jsonb),
  ('CalCode', '113947', 'Minimum standards of knowledge-general requirements', '(a) The PERSON IN CHARGE and all FOOD EMPLOYEEs shall have
            adequate knowledge of, and shall be properly trained in, FOOD safety as
            it relates to their assigned duties.

      (b) The PERSON IN CHARGE shall comply with both of the following:
                  (1) Have adequate knowledge of MAJOR FOOD ALLERGENs,
                        FOODs identified as MAJOR FOOD ALLERGENs, and the
                        symptoms that a MAJOR FOOD ALLERGEN could cause in a
                        sensitive individual who has an allergic reaction.
                  (2) Educate the EMPLOYEEs at the food facility regarding the
                        information described in paragraph (1), which the PERSON IN
                        CHARGE may elect to accomplish by, among other methods,
                        using a poster or job aid to which the EMPLOYEE can refer.

      (c) For purposes of this section, "PERSON IN CHARGE" means a
              designated person who has knowledge of safe FOOD handling
              practices and the MAJOR FOOD ALLERGENs as they relate to the
              specific FOOD preparation activities that occur at the FOOD FACILITY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.1', 'Food safety certification exam', '(a) FOOD FACILITIES that prepare, handle, or serve nonPREPACKAGED
            POTENTIALLY HAZARDOUS FOOD, except TEMPORARY FOOD
            FACILITIES, shall have an owner or EMPLOYEE who has successfully
                                               43
      passed an APPROVED and accredited FOOD safety certification
      examination as specified in Sections 113947.2 and 113947.3. There shall
      be at least one FOOD safety certified owner or EMPLOYEE at each
      FOOD FACILITY. No certified PERSON at a FOOD FACILITY may serve
      at any other FOOD FACILITY as the PERSON required to be certified
      pursuant to this subdivision. The certified owner or EMPLOYEE need not
      be present at the FOOD FACILITY during all hours of operation.
(b) FOOD FACILITIES that are not subject to the requirements of subdivision
      (a) that prepare, handle, or serve nonPREPACKAGED,
      nonPOTENTIALLY HAZARDOUS FOODs, except TEMPORARY FOOD
      FACILITIES, shall do one of the following:

            (1) Have an owner or EMPLOYEE who has successfully passed an
                  APPROVED and accredited FOOD safety certification
                  examination as specified in Sections 113947.2 and 113947.3.

            (2) Demonstrate to the ENFORCEMENT OFFICER that the
                  EMPLOYEEs have an adequate knowledge of FOOD safety
                  principles as they relate to the specific operation involved in their
                  assigned duties.

(c) On and after July 1, 2007, TEMPORARY FOOD FACILITIES that
      prepare, handle, or serve nonPREPACKAGED FOOD shall have an
      owner or PERSON IN CHARGE who can demonstrate to the
      ENFORCEMENT OFFICER that he or she has an adequate knowledge
      of FOOD safety principles as they relate to the specific FOOD FACILITY
      operation.

(d)
            (1) For the purposes of this section, multiple contiguous FOOD
                  FACILITIES PERMITted within the same site and under the
                  same management, ownership, or control shall be deemed to
                  be one FOOD FACILITY, notwithstanding the fact that the
                  FOOD FACILITIES may operate under separate PERMITs.
            (2) This subdivision shall not apply to the PREMISES of a licensed
                  winegrower or brandy manufacturer utilized for wine tastings
                  conducted pursuant to Section 23356.1 of the Business and
                  Professions Code of wine or brandy produced or bottled by, or
                  produced and prepackaged for, that license when use is limited
                  to wine tasting.

(e) A FOOD FACILITY that commences operation, changes ownership, or
      no longer has a certified owner or EMPLOYEE pursuant to this section
      shall have 60 days to comply with this subdivision.

(f) The responsibilities of a certified owner or EMPLOYEE at a FOOD
      FACILITY or an owner or PERSON IN CHARGE of a TEMPORARY
      FOOD FACILITY described in subdivision (c) shall include the safety of
      FOOD PREPARATION and service, including ensuring that all
      EMPLOYEEs who handle, or have responsibility for handling, non-
      PREPACKAGED FOODs of any kind, have sufficient knowledge to
      ensure the safe preparation or service of the FOOD, or both. The nature
      and extent of the knowledge that each EMPLOYEE is required to have

                                          44
            may be tailored, as appropriate, to the EMPLOYEE''s duties related to
            FOOD safety issues.
      (g) The FOOD safety certificate issued pursuant to Section 113947.3 shall
            be retained on file at the FOOD FACILITY at all times and shall be made
            available for inspection by the ENFORCEMENT OFFICER.
      (h) Certified individuals shall be recertified every five years by passing an
            APPROVED and accredited FOOD safety certification examination.
      (i) A FOOD SAFETY PROGRAM that was not in effect prior to January1,
            1999, shall not be enacted, adopted, implemented, or enforced, unless
            the program fully conforms to the requirements of this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.2', 'Approved and accredited exams', 'The FOOD safety certification examination for purposes of Section 113947.1
shall include, but need not be limited to, all of the following elements of
knowledge:

      (a) Foodborne illness, including terms associated with foodborne illness,
            micro-organisms, hepatitis A, and toxins that can contaminate FOOD and
            the illness that can be associated with contamination, definition and
            recognition of POTENTIALLY HAZARDOUS FOODs, chemical,
            biological, and physical contamination of FOOD, and the illnesses that
            can be associated with FOOD contamination, and major contributing
            factors for foodborne illness.

      (b) The relationship between time and temperature with respect to foodborne
           illness, including the relationship between time and temperature and
           micro-organisms during the various FOOD handling, preparation, and
           serving states, and the type, calibration, and use of thermometers in
           monitoring FOOD temperatures.

     (c) The relationship between personal hygiene and FOOD safety, including
           the association of hand contact, personal habits and behaviors, and
           FOOD EMPLOYEE health to foodborne illness, and the recognition of
           how policies, procedures, and management contribute to improved FOOD
           safety practices.

     (d) Methods of preventing FOOD contamination in all stages of FOOD
           handling, including terms associated with contamination and potential
           HAZARDs prior to, during, and after delivery.

     (e) Procedures for cleaning and sanitizing EQUIPMENT and UTENSILs.
     (f) Problems and potential solutions associated with facility and

           EQUIPMENT design, layout, and construction.
     (g) Problems and potential solutions associated with temperature control,

           preventing cross-contamination, housekeeping, and maintenance.
     (h) Describing FOODs identified as MAJOR FOOD ALLERGENs and the

           symptoms that a MAJOR FOOD ALLERGEN could cause in a sensitive
           individual who has an allergic reaction.

                                               45', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.3', 'Recognition of certificate', '(a) Food safety certification required pursuant to Section 113947.1 shall be
            achieved by successfully passing an examination from an accredited food
            protection manager certification organization. The certification
            organization shall be accredited by the American National Standards
            Institute as meeting the requirements of the Conference for Food
            Protection''s "Standards for Accreditation of Food Protection Manager
            Certification Programs." Those FOOD EMPLOYEES who successfully
            pass an APPROVED certification examination shall be issued a
            certificate by the certifying organization. The issuance date for each
            original certificate issued pursuant to this section shall be the date when
            the individual successfully completes the examination. Certificates shall
            be valid for five years from the date of original issuance. Any replacement
            or duplicate certificate shall have as its expiration date the same
            expiration date that was on the original certificate.

      (b)
                  (1) By July 20, 2008, the DEPARTMENT, in consultation with the
                        California Conference of Directors of Environmental Health,
                        representatives of the RETAIL FOOD industry, and other
                        interested parties, shall develop and implement a program for
                        the purposes of demonstrating adequate knowledge for
                        operators of TEMPORARY FOOD FACILITIES.
                  (2) At least one of the accredited food safety certification
                        examinations shall cost no more than sixty dollars ($60),
                        including the certificate. However, the DEPARTMENT may
                        adjust the cost of food safety certification examinations to reflect
                        actual expenses incurred in producing and administering the
                        food safety certification examinations required under this
                        section. If a food safety certification examination is not available
                        at the price established by the DEPARTMENT, the certification
                        and recertification requirements relative to food safety
                        certification examinations imposed by this section shall not
                        apply.
                  (3) At least one of the accredited food safety certification
                        examinations shall be offered online.
                  (4) An accredited food safety certification examination that is
                        provided with an in-person trainer-led class or is offered online
                        shall be proctored under secure conditions to protect the validity
                        of the food protection manager certification examination.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.4', 'Food certification prohibition', 'Except as provided in Section 113947.5, no city, county, or city and
county may enact, adopt, implement, or enforce any requirement that any FOOD
FACILITY or any PERSON certified pursuant to this section do any of the following:

      (a) Obtain any food safety certificate or other document in addition to the

                                               46
           certificate required by Section 113947.1.
     (b) Post, place, maintain, or keep the certificate other than as specified in

           subdivision (e) of Section 113947.1.
     (c) Pay any fee or other sum as a condition for having a certificate verified,

           validated, or otherwise processed by the city, county, or city and county.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.5', 'Violations of this section', 'Certification conferred pursuant to this part shall be recognized
throughout the state. Nothing in this part shall be construed to prohibit any
ENFORCEMENT AGENCY from implementing or enforcing a FOOD HANDLER
PROGRAM that took effect prior to January 1, 1998, but only in the form in which
the program existed prior to January 1, 1998.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113947.6', 'Infraction', 'Notwithstanding Section 114395, a violation of any provision in Sections
113947.1 to 113947.5, inclusive, shall constitute an infraction punishable by a fine
of not more than one hundred dollars ($100) for each day of operation in violation.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113948', 'Food Handler Card', '(a)
                  (1) Subject to the exceptions described in subdivision (e), a FOOD
                        HANDLER who is hired prior to June 1, 2011, shall obtain a
                        FOOD HANDLER card on or before July 1, 2011. Subject to the
                        exceptions described in subdivision (e), a FOOD HANDLER
                        who is hired on or after June 1, 2011, shall obtain a FOOD
                        HANDLER card within 30 days after the date of hire. Each
                        FOOD HANDLER shall maintain a valid FOOD HANDLER card
                        for the duration of the FOOD HANDLER''s employment as a
                        FOOD HANDLER.
                  (2) FOOD HANDLER cards shall be valid for three years from the
                        date of issuance, regardless of whether the FOOD HANDLER
                        changes employers during that period.
                  (3) A FOOD HANDLER card shall be recognized throughout the
                        state, except in jurisdictions described in subdivision (f).

      (b)
                  (1) Prior to January 1, 2012, a FOOD HANDLER may obtain a
                        FOOD HANDLER card from either one of the following:
                        (A) An American National Standards Institute (ANSI)
                              accredited training provider that meets ASTM International
                              E2659-09 Standard Practice for Certificate Programs.
                        (B) A food protection manager certification organization
                              described in Section 113947.3.

                                               47
            (2) Commencing January 1, 2012, a FOOD HANDLER shall obtain
                  a FOOD HANDLER card only from an American National
                  Standards Institute (ANSI) accredited training provider that
                  meets ASTM International E2659-09 Standard Practice for
                  Certificate Programs.

            (3) A FOOD HANDLER card shall be issued only upon successful
                  completion of a FOOD HANDLER training course and
                  examination that meets at least all of the following requirements:

                  (A)
                         (i) The course provides basic, introductory instruction on
                            the elements of knowledge described in subdivisions
                            (a), (b), (c), (d), (e), and (g) of Section 113947.2.
                         (ii) On or before January 1, 2021, the course shall include
                            instruction on both of the following:
                                    (I) The elements of knowledge described in
                                    paragraph (1) of subdivision (b) of Section 113947
                                    that are consistent with recommendations from a
                                    nationally organized allergy organization.
                                    (II) Safe handling FOOD practices for major
                                    FOOD allergens, as defined in Section 113820.5,
                                    as they relate to FOOD preparation activities that
                                    occur at a FOOD FACILITY, including, but not
                                    limited to, training on the avoidance of allergen
                                    cross-contamination.

                  (B) The course and examination are designed to be completed
                        within approximately two and one-half hours.

                  (C) The examination consists of at least 40 questions regarding
                        the required subject matter.

                  (D) A minimum score of 70 percent on the examination is
                        required to successfully complete the examination.

(c) The FOOD HANDLER training course and examination may be offered
      through a trainer-led class and examination, through the use of a
      computer program or the internet, or through a combination of trainer-led
      class and the use of a computer program or the internet. The use of the
      computer program or internet shall have sufficient security channels and
      procedures to guard against fraudulent activity. However, this subdivision
      shall not be construed to require the presence or participation of a proctor
      during a FOOD HANDLER training course examination that is provided
      through a computer program or the internet.

(d) This section shall apply to a FOOD HANDLER who is employed by a
      FOOD FACILITY, as defined in Section 113790, or an organized camp,
      as defined in Section 18897, consistent with Section 30730 of Title 17 of
      the California Code of Regulations.

(e) This section shall not apply to a FOOD HANDLER who is employed by
      any of the following:

                                          48
            (1) CERTIFIED FARMERS'' MARKETS.
            (2) COMMISSARIES.
            (3) Grocery stores, except for separately owned FOOD FACILITIES

                  to which this section otherwise applies that are located in the
                  grocery store. For purposes of this paragraph, "grocery store"
                  means a store primarily engaged in the retail sale of canned
                  FOOD, dry goods, fresh fruits and vegetables, and fresh
                  MEATs, FISH, and POULTRY and any area that is not
                  separately owned within the store where FOOD is prepared and
                  served, including a bakery, deli, and MEAT and seafood
                  counter. "Grocery store" includes convenience stores.
            (4) Licensed health care facilities.
            (5) MOBILE SUPPORT UNITs.
            (6) Public and private school cafeterias.
            (7) RESTRICTED FOOD SERVICE FACILITIES.
            (8) RETAIL stores in which a majority of sales are from a pharmacy,
                  as defined in Section 4037 of the Business and Professions
                  Code, and venues with snack bar service in which the majority
                  of sales are from admission tickets, but excluding any area in
                  which restaurant-style sit-down service is provided.
            (9) A FOOD FACILITY that provides in-house FOOD safety training
                  to all EMPLOYEEs involved in the preparation, storage, or
                  service of FOOD if all of the following conditions are met:
                  (A) The FOOD FACILITY uses a training course that has been

                        APPROVED for use by the FOOD FACILITY in another
                        state that has adopted the requirements described in
                        Subpart 2-103.11 of the 2001 edition of the model Food
                        Code, not including the April 2004 update, published by the
                        federal Food and Drug Administration.
                  (B) Upon request, the FOOD FACILITY provides evidence
                        satisfactory to the local ENFORCEMENT OFFICER
                        demonstrating that the FOOD FACILITY training program
                        has been APPROVED for use in another state pursuant to
                        subparagraph (A).
                  (C) The training is provided during normal work hours, and at
                        no cost to the EMPLOYEE.
            (10) A FOOD FACILITY that is subject to a collective bargaining
                  agreement with its FOOD HANDLERs.
            (11) Any city, county, city and county, state, or regional facility used
                  for the confinement of adults or minors, including, but not limited
                  to, a county jail, juvenile hall, camp, ranch, or residential facility.
            (12) An elderly nutrition program, administered by the California
                  Department of Aging, pursuant to the Older Americans Act of
                  1965 (42 U.S.C. Sec. 3001 et seq.), as amended.
(f) The requirements of this section, except for subdivision (i), shall not apply
      to a FOOD HANDLER subject to an existing local FOOD HANDLER
      program that took effect prior to January 1, 2009.

                                          49
      (g) Each FOOD FACILITY that employs a FOOD HANDLER subject to the
            requirements of this section shall maintain records documenting that
            each FOOD HANDLER employed by the FOOD FACILITY possesses a
            valid FOOD HANDLER card, and shall provide those records to the local
            ENFORCEMENT OFFICER upon request.

      (h)
                  (1) By January 1, 2025, the DEPARTMENT shall post on its internet
                        website a link to the internet website of ANSI-accredited FOOD
                        HANDLER training programs. A local public health department
                        shall provide a link to that web page on its own internet website.
                  (2) At least one FOOD HANDLER training course and examination
                        shall cost no more than fifteen dollars ($15), including a FOOD
                        HANDLER card. If a FOOD HANDLER training course and
                        examination is not available at that cost, the requirement to
                        obtain a FOOD HANDLER card imposed by this section shall
                        not apply.

      (i)
                  (1) An employer shall consider the time that it takes for the
                        EMPLOYEE to complete the training and the examination as
                        compensable "hours worked," for which the employer shall pay
                        and pursuant to Section 2802 of the Labor Code, shall pay the
                        EMPLOYEE for any necessary expenditures or losses
                        associated with the EMPLOYEE obtaining a FOOD HANDLER
                        card. An employer shall relieve an EMPLOYEE of all other work
                        duties while the EMPLOYEE is taking the training course and
                        examination.
                  (2) An employer shall not condition employment on an applicant or
                        EMPLOYEE having an existing FOOD HANDLER card.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "2", "article_title": "Employee Knowledge"}'::jsonb),
  ('CalCode', '113949', 'Intent', 'It is the intent of the Legislature to reduce the likelihood of foodborne
disease transmission by preventing any FOOD EMPLOYEE who is suffering from
symptoms associated with an ACUTE GASTROINTESTINAL ILLNESS, or known
to be infected with a communicable disease that is transmissible through FOOD,
from engaging in the handling of FOOD until the FOOD EMPLOYEE is determined
to be free of that illness or disease, or incapable of transmitting the illness or
disease through FOOD as specified in this article.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113949.1', 'Local health officer notification', '(a) When a local health officer is notified of an illness that can be transmitted
            by FOOD in a FOOD FACILITY or by an EMPLOYEE of a FOOD
            FACILITY, the local health officer shall inform the local enforcement
            agency. The local health officer or the local enforcement agency, or both,

                                               50
            shall notify the PERSON in charge of the FOOD FACILITY and shall
            investigate conditions and may, after the investigation, take appropriate
            action, and for reasonable cause, require any or all of the following
            measures to be taken:

                  (1) The immediate RESTRICTION or EXCLUSION of any
                         EMPLOYEE from the affected FOOD FACILITY.

                  (2) The immediate closing of the FOOD FACILITY until, in the
                         opinion of the local ENFORCEMENT AGENCY, the identified
                         danger of disease outbreak has been addressed. Any appeal
                         of the closure shall be made in writing within five days to the
                         applicable local ENFORCEMENT AGENCY.

                  (3) Any medical evaluation of any EMPLOYEE, including any
                         laboratory test or procedure that may be indicated. If an
                         EMPLOYEE refuses to participate in a medical evaluation, the
                         local ENFORCEMENT AGENCY may require the immediate
                         EXCLUSION of the refusing EMPLOYEE from that or any other
                         FOOD FACILITY until an acceptable medical evaluation or
                         laboratory test or procedure shows that the EMPLOYEE is not
                         infectious.

      (b) For purposes of this section, "illness" means a condition caused by any
            of the following infectious agents:
                  (1) Salmonella typhi.
                  (2) Salmonella spp.
                  (3) Shigella spp.
                  (4) Entamoeba histolytica.
                  (5) Enterohemorrhagic or shiga toxin producing Escherichia coli.
                  (6) Hepatitis A virus.
                  (7) Norovirus.
                  (8) Other communicable diseases that are transmissible through
                         FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113949.2', 'Responsibility of owner', 'The OWNER who has a FOOD safety certificate issued pursuant to
Section 113947.1 or the FOOD EMPLOYEE who has this FOOD safety certificate
shall instruct all FOOD EMPLOYEEs regarding the relationship between personal
hygiene and FOOD safety, including the association of hand contact, personal
habits and behaviors, and FOOD EMPLOYEE health to foodborne illness. The
OWNER or FOOD safety certified EMPLOYEE shall require FOOD EMPLOYEEs
to report the following to the PERSON IN CHARGE:

      (a) If a FOOD EMPLOYEE is diagnosed with an illness due to one of the
            following:
                  (1) Salmonella typhi.
                  (2) Salmonella spp.
                  (3) Shigella spp.
                  (4) Entamoeba histolytica.
                  (5) Enterohemorrhagic or shiga toxin producing Escherichia coli.

                                               51
                  (6) Hepatitis A virus.
                  (7) Norovirus.
      (b) If a FOOD EMPLOYEE has a wound that is one of the following:
                  (1) On the hands or wrists, unless an impermeable cover such as

                         a finger cot or stall protects the wound and a single-use glove
                         is worn over the impermeable cover.
                  (2) On exposed portions of the arms, unless the wound is protected
                         by an impermeable cover.
                  (3) On other parts of the body, unless the wound is covered by a
                         dry, durable, tight-fitting bandage.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113949.4', 'Responsibility of the food employee', 'A FOOD EMPLOYEE shall do both of the following:
      (a) Report to the PERSON IN CHARGE the information specified under

            Section 113949.2.
      (b) Comply with the EXCLUSIONS or RESTRICTIONS, or both, that are

            specified under Section 113950.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113949.5', 'Responsibility of the person in charge to notify the local', 'enforcement agency

      (a) The PERSON IN CHARGE shall notify the local ENFORCEMENT
            AGENCY when notified that the FOOD EMPLOYEE has been diagnosed
            with an infectious agent specified under subdivision (b) of Section
            113949.1.

      (b) A PERSON IN CHARGE shall notify the local ENFORCEMENT AGENCY
            when he or she is aware that two or more FOOD EMPLOYEEs are
            concurrently experiencing symptoms associated with an acute
            gastrointestinal illness.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113950', 'Exclusions and restrictions', '(a) The local health officer or, in consultation with the local health officer, the
            local ENFORCEMENT AGENCY shall do either of the following:
                  (1) EXCLUDE a FOOD EMPLOYEE from a FOOD FACILITY if the
                         FOOD EMPLOYEE is diagnosed with an infectious agent
                         specified in subdivision (b) of Section 113949.1 and the FOOD
                         EMPLOYEE is symptomatic and still considered infectious.
                  (2) RESTRICT a FOOD EMPLOYEE if the FOOD EMPLOYEE is
                         diagnosed with an infectious agent specified under subdivision
                         (b) of Section 113949.1 and is not experiencing symptoms of
                         the illness associated with that agent but is still considered
                         infectious with an agent specified in subdivision (b) of Section
                         113949.1.

     (b) The PERSON IN CHARGE shall do either of the following:
                  (1) EXCLUDE a FOOD EMPLOYEE from a FOOD FACILITY if the

                                               52
                         FOOD EMPLOYEE is diagnosed with an infectious agent
                         specified under subdivision (b) of Section 113949.1.
                  (2) RESTRICT a FOOD EMPLOYEE from working with exposed
                         FOOD; clean EQUIPMENT, UTENSILs, and LINENS; and
                         unwrapped single-service and SINGLE-USE ARTICLES in a
                         FOOD FACILITY if the FOOD EMPLOYEE is suffering from
                         symptoms of an ACUTE GASTROINTESTINAL ILLNESS.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113950.5', 'Removal of exclusions and restrictions', '(a) The PERSON IN CHARGE may remove a RESTRICTION for a FOOD
           EMPLOYEE upon the resolution of symptoms as reported by a FOOD
           EMPLOYEE if the FOOD EMPLOYEE states that he or she no longer has
           any symptoms of an ACUTE GASTROINTESTINAL ILLNESS.

     (b) Only the local health officer or the local ENFORCEMENT AGENCY, or
           both, shall remove EXCLUSIONs or RESTRICTIONs, or both, related to
           diagnosed illnesses due to infectious agents specified in subdivision (b)
           of Section 113949.1 after the local health officer provides a written
           clearance stating that the EXCLUDEd or RESTRICTed FOOD
           EMPLOYEE is no longer considered infectious.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "3", "article_title": "Employee Health"}'::jsonb),
  ('CalCode', '113952', 'Clean condition', 'FOOD EMPLOYEEs shall keep their hands and exposed portions of their
arms clean.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953', 'Handwashing facilities', '(a) Handwashing facilities shall be provided within or adjacent to toilet rooms.
           The number of handwashing facilities required shall be in accordance with
           local building and plumbing codes.

     (b)
                  (1) Except as otherwise provided in Section 114358, FOOD
                        FACILITIES constructed or extensively REMODELed after
                        January 1, 1996, that handle nonPREPACKAGED FOOD, shall
                        provide facilities exclusively for handwashing in FOOD
                        PREPARATION areas and in WAREWASHING areas that are
                        not located within or immediately adjacent to FOOD
                        PREPARATION areas. Handwashing facilities shall be sufficient
                        in number and conveniently located so as to be accessible at all
                        times for use by FOOD EMPLOYEEs.
                  (2) The handwashing facility shall be separated from the
                        WAREWASHING sink by a metal splashguard with a height of
                        at least 6 inches, that extends from the back edge of the
                        drainboard to the front edge of the drainboard, the corners of the
                                               53
                        barrier to be rounded. No splashguard is required if the distance
                        between the handwashing sink and the WAREWASHING sink
                        drainboards is 24 inches or more.
      (c) Handwashing facilities shall be equipped to provide WARM WATER
            under pressure for a minimum of 15 seconds through a mixing valve or
            combination faucet. If the temperature of water provided to a
            handwashing sink is not readily adjustable at the faucet, the temperature
            of the water shall be at least 100�F, but not greater than 108�F.
     (d) An automatic handwashing facility may be installed and used in
           accordance with the manufacturer''s instructions.
     (e) Notwithstanding subdivision (b), the ENFORCEMENT AGENCY may
           allow handwashing facilities other than those required by this section
           when it deems that the alternate facilities are adequate.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953.1', 'Using a handwashing facility', '(a) A handwashing facility shall be clean, unobstructed, and accessible at all
            times for EMPLOYEE use.

     (b) A handwashing facility shall not be used for purposes other than
           handwashing.

     (c) EMPLOYEEs shall not clean their hands in a sink used for FOOD
           PREPARATION, WAREWASHING, or in a service sink or a curbed
           cleaning facility used for the disposal of mop water and similar liquid
           waste.

     (d) Notwithstanding subdivision (c), a WAREWASHING sink may be used for
           handwashing as specified in Section 114125.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953.2', 'Handwashing supplies', 'A handwashing facility shall be provided with the following in dispensers
at, or adjacent to, each handwashing facility:

      (a) Handwashing cleanser.
      (b) Sanitary single-use towels or a heated-air hand drying device.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953.3', 'Handwashing procedure', '(a) Except as specified in subdivision (b) and (c), all EMPLOYEEs shall
            thoroughly wash their hands and that portion, if any, of their arms
            exposed to direct FOOD contact with cleanser and WARM WATER by
            vigorously rubbing together the surfaces of their lathered hands and arms
            for at least 10 to 15 seconds and thoroughly rinsing with clean running
            water followed by drying of cleaned hands and that portion, if any, of their
            arms exposed. EMPLOYEEs shall pay particular attention to the areas
            underneath the fingernails and between the fingers. EMPLOYEEs shall
            wash their hands in all of the following instances:
                  (1) Immediately before engaging in FOOD PREPARATION,
                        including working with nonPREPACKAGED FOOD, clean

                                               54
                        EQUIPMENT and UTENSILs, and unwrapped single-use FOOD
                        containers and UTENSILs.
                 (2) After touching bare human body parts other than clean hands
                       and clean, exposed portions of arms.
                 (3) After using the toilet room.
                 (4) After caring for or handling any animal allowed in a FOOD
                       FACILITY pursuant to this part.
                 (5) After coughing, sneezing, using a handkerchief or disposable
                       tissue, using tobacco, eating, or drinking.
                 (6) After handling soiled EQUIPMENT or UTENSILs.
                 (7) During FOOD PREPARATION, as often as necessary to remove
                       soil and contamination and to prevent cross-contamination when
                       changing tasks.
                 (8) When switching between working with raw FOOD and working
                       with READY-TO-EAT FOOD.
                 (9) Before initially donning gloves for working with FOOD.
                (10) Before dispensing or serving FOOD or handling clean
                       TABLEWARE and serving UTENSILs in the FOOD service area.
                (11) After engaging in other activities that contaminate the hands.
      (b) If APPROVED and capable of removing the types of soils encountered in
            the FOOD operations involved, an automatic handwashing facility may
            be used by FOOD EMPLOYEEs to clean their hands.
      (c) A FOOD FACILITY may incorporate an alternate glove use procedure in
            which double gloves are worn to handle raw animal proteins. The loose-
            fitting outer glove shall be removed in a manner to prevent cross-
            contamination of the tight-fitting inner glove before the inner glove is used
            as a barrier to bare hand contact with READY-TO-EAT FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953.4', 'Hand sanitizers', '(a) A hand antiseptic used as a topical application, a hand antiseptic solution
            used as a hand dip, or a hand antiseptic soap shall meet either one of the
            following requirements:
                  (1) Be an APPROVED drug that is listed in the FDA publication
                        APPROVED Drug Products with Therapeutic Equivalence
                        Evaluations as an APPROVED drug based on safety and
                        effectiveness.
                  (2) Have active antimicrobial ingredients that are listed in the FDA
                        monograph for OTC Antiseptic Health-Care Drug Products as
                        an antiseptic handwash.

      (b) In addition to the requirements of subdivision (a), the hand antiseptic used
            as a topical application, hand antiseptic solution used as a hand dip, or
            hand antiseptic soap shall meet either one of the following requirements:
                  (1) Have components that are exempted from the requirement of
                        being listed in federal FOOD ADDITIVE regulations as specified
                        in 21 CFR 170.39 - Threshold of regulation for substances used
                        in FOOD-contact ARTICLEs.

                                               55
                  (2) Comply with, and be listed in, either of the following federal
                        regulations:
                         (A) 21 CFR 178 - Indirect FOOD ADDITIVEs: Adjuvants,
                               Production Aids, and Sanitizers as regulated for use as a
                               FOOD ADDITIVE with conditions of safety use.
                         (B) 21 CFR 182 - Substances Generally Recognized as Safe,
                               21 CFR 184 - Direct FOOD Substances Affirmed as
                               Generally Recognized as Safe, or 21 CFR 186 - Indirect
                               FOOD Substances Affirmed as Generally Recognized as
                               Safe for use in contact with FOOD.

      (c) A hand antiseptic used as a topical application, a hand antiseptic solution
            used as a hand dip, or a hand antiseptic soap that meets the
            requirements of subdivisions (a) and (b) shall be applied only to hands
            that are cleaned in a manner described in Section 113953.3.

      (d) If a hand antiseptic or a hand antiseptic solution used as a hand dip does
            not meet the requirements of subdivision (b), the hand antiseptic or hand
            antiseptic solution used as a hand dip may be used only if its use is either
            of the following:
                  (1) Followed by thorough hand rinsing in clean water before hand
                        contact with FOOD directly or with the use of gloves.
                  (2) Limited to situations where bare hands do not come in direct
                        contact with FOOD.

      (e) A hand antiseptic solution used as a hand dip shall be maintained clean
            and at a strength equivalent to at least 100 mg/l chlorine.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113953.5', 'Handwashing signage', '(a) Except as specified in subdivision (b), a sign or poster that notifies FOOD
           EMPLOYEEs to wash their hands shall be posted at all handwashing
           lavatories used by FOOD EMPLOYEEs, and shall be clearly visible to
           FOOD EMPLOYEEs.

      (b) This section does not apply to toilet rooms in guestrooms of
           RESTRICTED FOOD SERVICE FACILITIES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113961', 'Handling ready-to-eat foods', '(a) FOOD EMPLOYEEs shall minimize bare hand and arm contact with
            nonPREPACKAGED FOOD that is in a READY-TO-EAT form.

      (b) FOOD EMPLOYEEs shall use nonlatex UTENSILS, including scoops,
            forks, tongs, paper wrappers, gloves, or other implements, to assemble
            READY-TO-EAT FOOD or to place READY-TO-EAT FOOD on
            TABLEWARE or in other containers. However, FOOD EMPLOYEEs may
            assemble or place on TABLEWARE or in other containers READY-TO-
            EAT FOOD in an APPROVED FOOD PREPARATION area without using
            UTENSILS if hands are cleaned in accordance with Section 113953.3.

      (c) FOOD that has been served to the CONSUMER and then wrapped or
            prepackaged at the direction of the CONSUMER shall be handled only
                                               56
            with UTENSILS. These UTENSILS shall be properly sanitized before
            reuse.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113963', 'Employee hand wash frequency', 'Consistent with Section 113952, a FOOD EMPLOYEE working in any
FOOD FACILITY, as defined in Section 113789 of the Health and Safety Code,
shall be permitted to wash their hands every 30 minutes and additionally as
needed.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "4", "article_title": "Handwashing"}'::jsonb),
  ('CalCode', '113967', 'Food contamination by employees', 'No EMPLOYEE shall commit any act that may cause the contamination
or adulteration of FOOD, FOOD-CONTACT SURFACEs, or UTENSILs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "5", "article_title": "Personal Cleanliness"}'::jsonb),
  ('CalCode', '113968', 'Fingernails', 'FOOD EMPLOYEEs shall keep their fingernails trimmed, filed, and
maintained so the edges and surfaces are cleanable and not rough.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "5", "article_title": "Personal Cleanliness"}'::jsonb),
  ('CalCode', '113969', 'Hair restraints', '(a) Except as specified in subdivision (b), all FOOD EMPLOYEEs preparing,
            serving, or handling FOOD or UTENSILs shall wear hair restraints such
            as hats, hair coverings, or nets which are designed and worn to effectively
            keep their hair from contacting nonPREPACKAGED FOOD, clean
            EQUIPMENT, UTENSILs, LINENS, and unwrapped SINGLE-USE
            ARTICLES.

      (b) This section does not apply to FOOD EMPLOYEEs, such as counter staff
            who only serve BEVERAGEs and wrapped or PREPACKAGED FOODs,
            hostesses, and wait staff, if they present a minimal risk of contaminating
            nonPREPACKAGED FOOD, clean EQUIPMENT, UTENSILs, LINENS,
            and unwrapped SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "5", "article_title": "Personal Cleanliness"}'::jsonb),
  ('CalCode', '113971', 'Clothing', 'FOOD EMPLOYEEs shall wear clean outer clothing to prevent
contamination of FOOD, EQUIPMENT, UTENSILs, LINENS, and SINGLE-USE
ARTICLES.

                                               57', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "5", "article_title": "Personal Cleanliness"}'::jsonb),
  ('CalCode', '113973', 'Use of gloves', '(a) Single-use nonlatex gloves shall be worn when contacting FOOD and
            FOOD-CONTACT SURFACEs if the EMPLOYEE has any cuts, sores,
            rashes, artificial nails, nail polish, rings, other than a plain ring, such as a
            wedding band, uncleanable orthopedic support devices, or fingernails
            that are not clean, smooth, or neatly trimmed.

      (b) Whenever gloves are worn, they shall be changed, replaced, or washed
            as often as handwashing is required by this part. Single-use gloves shall
            not be washed.

      (c) If used, single-use gloves shall be used for only one task, such as working
            with READY-TO-EAT FOOD or with raw FOOD of animal origin, used for
            no other purpose, and shall be discarded when damaged or soiled, or
            when interruptions in the FOOD handling occur.

      (d) Except as specified in subdivision (e), nonlatex slash-resistant gloves that
            are used to protect the hands during operations requiring cutting shall be
            used only with FOOD that is subsequently cooked as specified in Section
            114004, such as FROZEN FOOD or a primal cut of MEAT.

      (e) Nonlatex slash-resistant gloves may be used with READY-TO-EAT
            FOOD that will not be subsequently cooked if the slash-resistant gloves
            have a SMOOTH, durable, and nonabsorbent outer surface or if the
            slash-resistant gloves are covered with a SMOOTH, durable,
            nonabsorbent glove, or a single-use glove.

      (f) Cloth gloves may not be used in direct contact with FOOD unless the
            FOOD is subsequently cooked.

      (g) The use of latex gloves is prohibited in FOOD FACILITIES and RETAIL
            FOOD establishments. Types of nonlatex gloves that may be used in a
            FOOD FACILITY or RETAIL FOOD establishment include, but are not
            limited to, nitrile, polyethylene, and vinyl.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113974', 'Employees with cold or flu symptoms', 'FOOD EMPLOYEEs experiencing, while at work in a FOOD FACILITY,
persistent sneezing, coughing, or runny nose that is associated with discharges
from the eyes, nose, or mouth, and that cannot be controlled by medication, shall
not work with exposed FOOD; clean EQUIPMENT, UTENSILs, or LINENS; or
unwrapped single-use UTENSILs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113975', 'Employees with open or draining wounds', '(a) Except as provided in subdivision (b), an EMPLOYEE who has a wound
            that is open or draining shall not handle FOOD.

      (b) A FOOD EMPLOYEE who has a wound is restricted from FOOD handling
            unless the FOOD EMPLOYEE complies with all of the following:

                                               58
                  (1) If the wound is located on the hand or wrist, an impermeable
                        cover, such as a finger cot or stall, shall protect the wound. A
                        single-use glove shall be worn over the impermeable cover.

                  (2) If the wound is located on exposed portions of the arms, an
                        impermeable cover shall protect the wound.

                  (3) If the wound is located on other parts of the body, a dry, durable,
                        tight-fitting bandage shall cover the wound.

                  (4) For purposes of this section, a wound also includes a cut, sore,
                        rash, or lesion.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113976', 'Preventing contamination when testing', 'Unless a UTENSIL used to taste FOOD is discarded after the first time it
is used for this purpose and before the next tasting or any other use, the UTENSIL
shall be washed, rinsed, and sanitized pursuant to Chapter 5 (commencing with
Section 114095) between tastings and before any other use.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113977', 'Eating, drinking or using tobacco', '(a) Except as specified in subdivision (b), an EMPLOYEE shall eat, drink, or
            use any form of tobacco only in designated areas where contamination
            of nonPREPACKAGED FOOD; clean EQUIPMENT, UTENSILs, and
            LINENS; unwrapped SINGLE-USE ARTICLES; or other items needing
            protection cannot result.

      (b) A FOOD EMPLOYEE may drink from a closed BEVERAGE container if
            the container is handled to prevent contamination of the EMPLOYEE''s
            hands, the container, nonPREPACKAGED FOOD, and FOOD-
            CONTACT SURFACEs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113978', 'No smoking sign', 'FOOD FACILITIES shall have a "no smoking" sign posted in the FOOD
PREPARATION, FOOD storage, and WAREWASHING areas.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "3", "chapter_title": "Management and Personnel", "article": "6", "article_title": "Hygienic Practices"}'::jsonb),
  ('CalCode', '113980', 'Requirements for food', 'All FOOD shall be manufactured, produced, prepared, compounded,
packed, stored, transported, kept for sale, and served so as to be pure and free
from adulteration and spoilage; shall have been obtained from APPROVED
SOURCEs; shall be protected from dirt, VERMIN, unnecessary handling, droplet
contamination, overhead leakage, or other environmental sources of

                                               59
contamination; shall otherwise be fully fit for human consumption; and shall
conform to the applicable provisions of the Sherman Food, Drug, and Cosmetic
Law (Part 5 (commencing with Section 109875)).', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113982', 'Food transportation', '(a) Except as specified in subdivision (b), FOOD shall be transported in a
            manner that meets the following requirements:
                  (1) The interior floor, sides, and top of the FOOD holding area shall
                        be constructed of a SMOOTH, washable, impervious material
                        capable of withstanding frequent cleaning.
                  (2) The FOOD holding area shall be constructed and operated so
                        that no liquid wastes can drain onto any street, sidewalk, or
                        PREMISES.
                  (3) Except as provided in subdivision (a) of Section 113996,
                        POTENTIALLY HAZARDOUS FOOD shall be maintained at the
                        required holding temperatures.

       (b)
            (1) READY-TO-EAT FOOD delivered through a THIRD-PARTY FOOD
                  DELIVERY PLATFORM shall be transported in a manner that meets
                  all of the following requirements:
                      (A) The interior floor, sides, and top of the FOOD holding area
                           shall be clean and capable of withstanding frequent
                           cleaning.
                      (B) READY-TO-EAT FOOD shall be protected from
                           contamination in accordance with Section 113980.
                      (C) The FOOD shall be maintained at holding temperature
                           necessary to prevent spoilage.
            (2) All bags or containers in which READY-TO-EAT FOODs are being
                  transported or delivered from a FOOD FACILITY to a customer
                  through a THIRD-PARTY FOOD DELIVERY PLATFORM shall be
                  closed by the FOOD FACILITY with a tamper-evident method prior
                  to the FOOD deliverer, who transports and delivers READY-TO-EAT
                  FOOD for the THIRD-PARTY FOOD DELIVERY PLATFORM, taking
                  possession of the READY-TO-EAT FOOD.
            (3) ENFORCEMENT OFFICERs may recover from a THIRD-PARTY
                  FOOD DELIVERY PLATFORM reasonable costs that are associated
                  with the enforcement of this section against FOOD deliverers who
                  transport and deliver READY-TO-EAT FOOD for the THIRD-PARTY
                  FOOD DELIVERY PLATFORM.

       (c)
            (1) This section shall not apply to the transportation of prepackaged
                  nonPOTENTIALLY HAZARDOUS FOODS.
            (2) Paragraph (2) of subdivision (b) shall not apply to FOOD transported
                as part of a CHARITABLE FEEDING PROGRAM or FOOD being
                donated to a FOOD BANK, as defined in Section 113783.

                                               60', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113984', 'Food preparation area, protection from contamination', '(a) Adequate and suitable counter space shall be provided for all FOOD
            PREPARATION operations.

      (b) Except as specified in subdivision (c), FOOD PREPARATION shall be
            conducted within a fully enclosed FOOD FACILITY.

      (c) LIMITED FOOD PREPARATION shall be conducted within a FOOD
            COMPARTMENT or as APPROVED by the ENFORCEMENT AGENCY.
            Subject to subdivision (g), this subdivision does not require an additional
            FOOD COMPARTMENT when adding ingredients to a BEVERAGE or
            dispensing into a serving container when the BEVERAGE is prepared for
            immediate service in response to an individual CONSUMER order.

      (d) FOOD shall be prepared with suitable UTENSILs and on surfaces that,
            prior to use, have been cleaned, rinsed, and sanitized as specified in
            Section 114117 to prevent cross-contamination.

      (e) Overhead protection shall be provided above all FOOD PREPARATION,
            FOOD display, WAREWASHING, and FOOD STORAGE areas.

      (f) All FOOD shall be thawed, washed, sliced, and cooled within an
            APPROVED fully enclosed FOOD FACILITY.

      (g) Based upon local environmental conditions, location, and other similar
            factors, the ENFORCEMENT OFFICER may establish additional
            structural or operational requirements or both for MOBILE FOOD
            FACILITIES as necessary to ensure that FOODs, FOOD-CONTACT
            SURFACEs, and UTENSILs are of a safe and sanitary quality.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113984.1', 'Food preparation area, consumer access', 'CONSUMER access to a FOOD FACILITY through the FOOD
PREPARATION area is permissible, at the discretion of the PERMIT HOLDER, if
READY-TO-EAT FOODs are prepared in APPROVED areas separated from
sources of contamination by a space of at least three feet from the CONSUMER
and in areas that are separate from raw or undercooked FOODs. The route of
access shall be separated from the required space by a rail or wall at least three
feet high or otherwise clearly delineated.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113986', 'Food and ingredient contamination', '(a) FOOD shall be protected from cross-contamination by utilizing one or
            more of the following methods:
                  (1) Separating raw FOOD of animal origin during transportation,
                        storage, preparation, holding, and display from raw READY-TO-
                        EAT FOOD, including other raw FOOD of animal origin such as
                        FISH for sushi or MOLLUSCAN SHELLFISH, or other raw
                        READY-TO-EAT FOOD such as PRODUCE, and cooked
                        READY-TO-EAT FOOD in any of the following ways:
                        (A) Using separate EQUIPMENT of each type.
                        (B) Arranging each type of FOOD in EQUIPMENT so that

                                               61
                        cross-contamination of one type with another is prevented.
                  (C) Preparing each type of FOOD at different times or in

                        separate areas.
                  (D) Except as specified in subdivision (b), storing the FOOD in

                        packages, covered containers, or wrappings.
                  (E) Cleaning HERMETICALLY SEALED CONTAINERs of

                        FOOD of visible soil before opening.
                  (F) Protecting FOOD containers that are received packaged

                        together in a case or overwrap from cuts when the case or
                        overwrap is opened.
                  (G) Storing damaged, spoiled, or recalled FOOD being held in
                        the FOOD establishment as specified in Section 114055.
                  (H) Separating fruits and vegetables before they are washed,
                        as specified in Section 113992, from READY-TO-EAT
                        FOOD.
            (2) Except when combined as ingredients, separating types of raw
                  FOODs of animal origin from each other during transportation,
                  storage, preparation, holding, and display in the following ways:
                  (A) Using separate EQUIPMENT for each type.
                  (B) Arranging each type of FOOD in EQUIPMENT so that
                        cross-contamination of one type with another is prevented.
                  (C) Preparing each type of FOOD at different times or in
                        separate areas.
                  (D) Except as specified in subdivision (b), storing the FOOD in
                        packages, covered containers, or wrappings.
                  (E) Cleaning HERMETICALLY SEALED CONTAINERs of
                        FOOD of visible soil before opening.
                  (F) Protecting FOOD containers that are received packaged
                        together in a case or overwrap from cuts when the case or
                        overwrap is opened.
                  (G) Storing damaged, spoiled, or recalled FOOD being held in
                        the FOOD ESTABLISHMENT as specified in Section
                        114055.
                  (H) Separating fruits and vegetables before they are washed,
                        as specified in Section 113992, from READY-TO-EAT
                        FOODs.
(b) Subparagraph (D) of paragraph (2) of subdivision (a) of this section shall
      not apply to any of the following:
            (1) Whole, uncut, raw fruits and vegetables and nuts in the shell that
                  require peeling or hulling before consumption.
            (2) Primal cuts, quarters, or sides of raw MEAT or slab bacon that
                  are hung on clean, sanitized hooks or placed on clean, sanitized
                  racks.
            (3) Whole, uncut, processed MEATs, such as country hams, and
                  smoked or cured sausages that are placed on clean, sanitized
                  racks.
            (4) FOOD being cooled as specified in subdivision (b) of Section

                                          62
                        114002.1.
                  (5) SHELLSTOCK.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113988', 'Protection from unapproved additives', '(a) FOOD shall be protected from contamination that may result from the
            addition of unsafe or unAPPROVED FOOD or color ADDITIVEs or unsafe
            or unAPPROVED levels of APPROVED FOOD and color ADDITIVEs.

      (b) A FOOD EMPLOYEE may not apply sulfiting agents to fresh fruits and
            vegetables intended for raw consumption, or to any POTENTIALLY
            HAZARDOUS FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113990', 'Ice used as exterior coolant prohibited as ingredient', 'Ice that has been used as a medium for cooling the exterior surfaces of
FOOD such as melons or FISH, PREPACKAGED FOODs such as canned
BEVERAGEs, or cooling coils and tubes of EQUIPMENT, shall not be used as
FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113992', 'Washing produce', '(a) PRODUCE shall be thoroughly washed in POTABLE WATER to remove
            soil and other contaminants before being cut, combined with other
            ingredients, cooked, served, or offered for human consumption in
            READY-TO-EAT form, except as specified in subdivision (b) and except
            when intended for washing by the CONSUMER before consumption.

      (b) Chemicals used to wash or peel PRODUCE shall meet the requirements
            specified in 21 C.F.R. 173.315.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "1", "article_title": "Protection from Contamination"}'::jsonb),
  ('CalCode', '113996', 'Hot and cold holding, potentially hazardous food', '(a) Except during preparation, cooking, cooling, transportation to or from a
            RETAIL FOOD FACILITY for a period of less than 30 minutes, or when
            time is used as the public health control as specified under Section
            114000, or as otherwise provided in this section, POTENTIALLY
            HAZARDOUS FOOD shall be maintained at or above 135�F, or at or
            below 41�F.

      (b) Roasts cooked to a temperature and for a time specified in subdivision
            (b) of Section 114004 may be held at a temperature of 130�F or above.

      (c) The following FOODs may be held at or below 45�F:
                  (1) Raw shell EGGs.
                  (2) Unshucked live MOLLUSCAN SHELLFISH.
                  (3) Pasteurized milk and pasteurized milk products in original,

                                               63
                        SEALED containers.
                  (4) POTENTIALLY HAZARDOUS FOODs held for dispensing in

                        VENDING MACHINES.
                  (5) POTENTIALLY HAZARDOUS FOODs held for sampling at a

                        CERTIFIED FARMERS'' MARKET.
                  (6) POTENTIALLY HAZARDOUS FOODs held during

                        transportation.
      (d) POTENTIALLY HAZARDOUS FOODs held for dispensing in serving

            lines and salad bars may be maintained above 41�F, but not above 45�F,
            during periods not to exceed 12 hours in any 24-hour period only if the
            unused portions are disposed of at or before the end of this 24-hour
            period. For purposes of this subdivision, a display case shall not be
            deemed to be a serving line.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '113998', 'Time limits for food preparation', 'If it is necessary to remove POTENTIALLY HAZARDOUS FOOD from
the specified holding temperatures to facilitate preparation, this preparation shall
in no case exceed two cumulative hours without a return to the specified holding
temperatures.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114000', 'Time as a public health control', '(a) Except as specified in subdivision (b), if time only, rather than time in
            conjunction with temperature, is used as the public health control for a
            working supply of POTENTIALLY HAZARDOUS FOOD before cooking
            or for READY-TO-EAT POTENTIALLY HAZARDOUS FOOD that is
            displayed or held for service for immediate consumption, the following
            shall occur:
                  (1) The FOOD shall be marked or otherwise identified to indicate
                        the time that is four hours past the point in time when the FOOD
                        is removed from temperature control.
                  (2) The FOOD shall be cooked and served, served if ready-to-eat,
                        or discarded within four hours from the point in time when the
                        FOOD is removed from temperature control.
                  (3) The FOOD in unmarked containers or packages or marked to
                        exceed a four-hour limit shall be discarded.
                  (4) Written procedures shall be maintained in the FOOD FACILITY
                        and made available to the ENFORCEMENT AGENCY upon
                        request, that ensure compliance with this section and Section
                        114002, for FOOD that is prepared, cooked, and refrigerated
                        before time is used as a public health control.

      (b) Time only, rather than time in conjunction with temperature, may not be
            used as the public health control for raw EGGs in the following FOOD
            FACILITIES:
                  (1) Licensed health care facilities.
                  (2) Public and private school cafeterias

                                               64', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114002', 'Cooling', '(a) Whenever FOOD has been prepared or heated so that it becomes
            POTENTIALLY HAZARDOUS, it shall be rapidly cooled if not held at or
            above 135�F.

      (b) After heating or hot holding, POTENTIALLY HAZARDOUS FOOD shall
            be cooled rapidly from 135�F to 41�F or below within six hours and, during
            this time the decrease in temperature from 135�F to 70�F shall occur
            within two hours.

      (c) POTENTIALLY HAZARDOUS FOOD shall be cooled within four hours to
            41�F or less if prepared from ingredients at ambient temperature, such as
            reconstituted FOODs and canned tuna.

      (d) Except as specified in subdivision (e), a POTENTIALLY HAZARDOUS
            FOOD received in compliance with LAWs allowing a temperature above
            41�F during shipment from the supplier as specified in Section 114037,
            shall be cooled within four hours to 41�F or less.

      (e) Pasteurized milk in original, SEALED containers, pasteurized milk
           products in original, SEALED containers, raw shell EGGs, and unshucked
           live MOLLUSCAN SHELLFISH need not comply with subdivision (c) or
           (d) if these FOODs are placed immediately upon their receipt in
           refrigerated EQUIPMENT that maintains an ambient temperature of 45�F
           or less.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114002.1', 'Cooling methods', '(a) The rapid cooling of POTENTIALLY HAZARDOUS FOODs shall be
            accomplished in accordance with the time and temperature criteria
            specified in Section 114002 by using one or more of the following
            methods based on the type of FOOD being cooled:
                  (1) Placing the FOOD in shallow pans.
                  (2) Separating the FOOD into smaller or thinner portions.
                  (3) Using rapid cooling EQUIPMENT.
                  (4) Using containers that facilitate heat transfer.
                  (5) Adding ice as an ingredient.
                  (6) Using ice paddles.
                  (7) Inserting appropriately designed containers in an ice bath and
                        stirring frequently.
                  (8) In accordance with an HACCP PLAN adopted pursuant to this
                        part.
                  (9) Utilizing other effective means that have been APPROVED by
                        the ENFORCEMENT AGENCY.

      (b) When placed in cooling or cold holding EQUIPMENT, FOOD containers
            in which FOOD is being cooled shall be arranged in the EQUIPMENT to
            provide maximum heat transfer through the container walls, loosely
            covered, or uncovered if protected from overhead contamination during
            the cooling period to facilitate heat transfer from the surface of the FOOD,
            and stirred as necessary to evenly cool a liquid or a semi-liquid FOOD.

                                               65', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114004', 'Cooking temperatures of raw animal foods', '(a) Except as specified in subdivision (b) or (c), raw animal FOODs such as
      EGGs, FISH, MEAT, POULTRY, and FOODs containing these raw
      animal FOODs shall be cooked to heat all parts of the FOODs to a
      temperature and for a time that complies with the following methods
      based on the FOOD that is cooked:
            (1) The following shall be heated to a minimum internal temperature
                  of 145�F or above for 15 seconds:
                  (A) Raw shell EGGs that are broken and prepared in response
                        to a CONSUMER''s order and for immediate service.
                  (B) Except as specified in paragraph (2) or (3) of subdivision (a)
                        or subdivision (b) or (c), FISH and MEAT, including GAME
                        ANIMALs commercially raised for FOOD.
            (2) The following FOODs shall be heated to a minimum internal
                  temperature of 155�F for 15 seconds or the temperature
                  specified in the following chart that corresponds to the holding
                  time:
                (A) Ratites and mechanically tenderized and INJECTED
                        MEATs.
                  (B) The following FOODs, if they are comminuted: FISH,
                        MEAT, and GAME ANIMALs commercially raised for FOOD
                        as specified in subparagraph (B) of paragraph (1).
                  (C) Raw EGGs that are not prepared as specified in paragraph
                        (1).

Minimum           Time
Temperature (�F)
                  3 minutes
145               1 minute
150               < 1 second (instantaneous)
158

(3) The following shall be heated to a minimum internal temperature
      of 165�F for 15 seconds:
      (A) POULTRY.
      (B) Baluts
      (C) Stuffed FISH, stuffed MEAT, stuffed POULTRY, and stuffed
            ratites.
      (D) Stuffing containing FISH, MEAT, POULTRY, or ratites.
      (E) Pasta and any other FOOD stuffed with FISH, MEAT,
            POULTRY, or ratites.
      (F) GAME ANIMALs.

                               66
(b) Whole beef roasts, corned beef roasts, pork roasts, lamb roasts and
      cured pork roasts, such as ham, shall be cooked as specified in both of
      the following:
            (1) In an oven that is preheated to the temperature specified for the
                  roast''s weight in the following chart and that is held at that
                  temperature:

Oven Type         Oven Temperature Based on Roast Weight

Still Dry         Less than 10 lbs               10 lbs or more
Convection        350�F or more                  250�F or more
                  325�F or more                  250�F or more

High Humidity*    250�F or less                  250�F or less

*Relative humidity greater than 90 percent for at least 1 hour measured in the
cooking chamber or exit of the oven; or in a moisture-impermeable bag that
provides 100 percent humidity.

            (2) As specified in the following chart, to heat all parts of the FOOD
                  to a temperature and for the holding time that corresponds to
                  that temperature:

Temperature (�F)       Time* in    Temperature    Time* in Seconds
                       Minutes           (�F)
130               112                            134
131               89             147             85
133               56             149             54
135               36             151             34
136               28             153             22
138               18             155             14
140               12             157             0
142               8              158
144               5
145               4

* Holding time may include post oven heat rise.

(c) A raw or undercooked whole-muscle, intact beef steak may be served or
      offered for sale in a READY-TO-EAT form if all of the following conditions
      are satisfied:
             (1) The FOOD FACILITY serves a population that is not a highly
                  susceptible population.

                                 67
                   (2) The steak is labeled to indicate that it meets the definition of
                        "whole-muscle, intact beef" as specified in subdivision (c) of
                        Section 114021.

                   (3) The steak is cooked on both the top and bottom to a surface
                        temperature of 145 degrees Fahrenheit or above and a cooked
                        color change is achieved on all external surfaces.

      (d) A raw animal FOOD such as raw EGG, raw FISH, raw marinated FISH,
            raw MOLLUSCAN SHELLFISH, or steak tartare, or a partially cooked
            FOOD such as lightly cooked FISH, soft cooked EGGs, or rare meat other
            than whole-muscle, intact beef steaks as specified in subdivision (c), may
            be served or offered for sale upon consumer request or selection in a
            READY-TO-EAT form if either of the following conditions are satisfied:
                   (1) All of the following requirements are met:
                        (A) As specified in paragraph (1) or (2) of subdivision (e) of
                            Section 114091, the food facility serves a population that is
                            not a highly susceptible population.
                        (B) The FOOD, if served or offered for service by consumer
                            selection from a children''s menu, does not contain
                            COMMINUTED meat.
                        (C) The consumer is informed pursuant to Section 114093 to
                            ensure its safety, the FOOD should be cooked as specified
                            in subdivision (a) or (b).
                   (2) The DEPARTMENT grants a variance from subdivision (a) or (b)
                        pursuant to Section 114417 based on a HACCP plan that
                        satisfies all of the following conditions:
                        (A) It is submitted by the PERMITHOLDER and approved
                            pursuant to Sections 114417.1 and 114417.3.
                        (B) It documents scientific data or other information showing that
                            a lesser time and temperature regimen results in safe FOOD.
                        (C) It verifies that equipment and procedures for FOOD
                            prepared and training of FOOD EMPLOYEEs at the FOOD
                            FACILITY meet the conditions of the variance.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114008', 'Microwave cooking', 'Raw FOODs of animal origin cooked in a microwave oven shall meet all
of the following requirements:

      (a) Be rotated or stirred throughout or midway during cooking to compensate
            for uneven distribution of heat.

      (b) Be covered to retain surface moisture.
      (c) Be heated to a temperature of at least 165�F in all parts of the FOOD.
      (d) Stand covered for at least two minutes after cooking to obtain

            temperature equilibrium.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114010', 'Plant food cooking for hot holding', 'Fruits and vegetables that are cooked for hot holding shall be cooked to

                                               68
a minimum temperature of 135�F.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114012', 'Pasteurized egg, substitute for raw shell eggs for certain', 'recipes

            Except as specified in Section 114091, pasteurized EGGs or pasteurized
EGG products shall be substituted for raw shell EGGs in the preparation of FOODs
such as Caesar salad, hollandaise or Bearnaise sauce, mayonnaise, EGGnog, ice
cream, and EGG-fortified BEVERAGEs that are not cooked as specified under
Section 114004, nor included in Section 114093.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114014', 'Preparation for immediate service', 'Cooked and refrigerated FOOD that is prepared for immediate service in
response to an individual CONSUMER order may be served at any temperature.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114016', 'Reheating for hot holding', '(a) Except as specified under subdivisions (b) and (c), POTENTIALLY
            HAZARDOUS FOOD that is cooked, cooled, and reheated for hot holding
            shall be reheated so that all parts of the FOOD reach a temperature of at
            least 165�F for 15 seconds.

      (b) Except as specified under subdivision (c), POTENTIALLY HAZARDOUS
            FOOD reheated in a microwave oven for hot holding shall be reheated so
            that all parts of the FOOD reach a temperature of at least 165�F and the
            FOOD is rotated or stirred, covered, and allowed to stand covered for at
            least two minutes after reheating.

      (c) READY-TO-EAT FOOD taken from a commercially processed,
            HERMETICALLY SEALED CONTAINER, or from an intact package from
            a FOOD processing plant shall be heated to a temperature of at least
            135�F for hot holding.

      (d) Reheating for hot holding shall be done rapidly, and the time the FOOD
            is between 41�F and 165�F shall not exceed two hours.

      (e) Remaining unsliced portions of roasts that are cooked as specified under
            Section 114004 may be reheated for hot holding using the oven
            parameters and minimum time and temperature conditions as specified
            in Section 114004.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114018', 'Frozen food', 'FROZEN FOODs shall be stored and displayed in their FROZEN state
unless being thawed in accordance with Section 114020.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114020', 'Thawing', 'FROZEN POTENTIALLY HAZARDOUS FOOD shall only be thawed in

                                               69
one of the following ways:
      (a) Under refrigeration that maintains the FOOD temperature at 41�F or
            below.
      (b) Completely submerged under potable running water for a period not to
            exceed two hours at a water temperature of 70�F or below, and with
            sufficient water velocity to agitate and flush off loose particles into the sink
            drain.
      (c) In a microwave oven if immediately followed by immediate preparation.
      (d) As part of a cooking process.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "2", "article_title": "Time and Temperature Relationships"}'::jsonb),
  ('CalCode', '114021', 'Compliance with food law', '(a) FOOD shall be obtained from sources that comply with all applicable
            LAWs.

      (b) FOOD stored or prepared in a private home shall not be used or offered
            for sale in a FOOD FACILITY, unless that FOOD is prepared by a
            COTTAGE FOOD OPERATION that is registered or has a PERMIT
            pursuant to Section 114365.

      (c) Whole-muscle, intact beef steaks that are intended for consumption in an
            undercooked form that does not satisfy the conditions for service
            pursuant to Section 114093 shall satisfy all of the following conditions:
                   (1) Either the FOOD has been obtained from a food processing
                        plant that, upon request by the purchaser, packages the steaks
                        and labels them to indicate that the steak meets the definition of
                        whole-muscle, intact beef, or is deemed acceptable by the
                        ENFORCEMENT AGENCY based on other evidence, such as
                        written buyer specifications or invoices, that indicate that the
                        steaks meet the definition of whole-muscle intact beef.
                   (2) If the FOOD is individually cut in a FOOD FACILITY, all of the
                        following conditions are satisfied:
                        (A) The FOOD is cut from whole-muscle intact beef that is
                              labeled by a FOOD processing plant as specified in
                              paragraph (1).
                        (B) The FOOD is prepared so it remains intact.
                        (C) If the FOOD is packaged for undercooking in a FOOD
                              FACILITY, the FOOD is labeled as specified in paragraph
                              (1).', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114023', 'Food in a hermetically sealed container', 'FOOD in a HERMETICALLY SEALED CONTAINER shall be obtained
from a FOOD processing plant that is regulated by the FOOD regulatory agency
that has jurisdiction over the plant, or from a COTTAGE FOOD OPERATION that

                                               70
produces jams, jellies, and preserves and that is registered or has a PERMIT

pursuant to Section 114365.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114024', 'Egg and milk products, pasteurized', '(a) Liquid, frozen, and dry EGGs and EGG products shall be obtained
            pasteurized.

      (b) FROZEN milk products, such as ice cream, shall be obtained pasteurized
            as specified in 21 C.F.R. 135 -FROZEN Desserts.

      (c) Fluid and dry milk and milk products complying with Grade A standard as
            specified in LAW shall be obtained pasteurized.

      (d) This section shall not apply to properly labeled prepackaged raw milk and
            raw milk products obtained from an APPROVED SOURCE and
            dispensed and sold at RETAIL by the FOOD FACILITY in compliance
            with 17 CCR 11380.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114025', 'Ice', 'Ice for use as a FOOD or a cooling medium shall be made from POTABLE
WATER.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114027', 'Fish', 'FISH that are received for sale or service shall be commercially and
legally caught or harvested.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114029', 'Molluscan shellfish', '(a) MOLLUSCAN SHELLFISH shall be obtained from sources according to
            LAW or the requirements specified in the United States Department of
            Health and Human Services, Public Health Service, Food and Drug
            Administration, National Shellfish Sanitation Program Guide for the
            Control of Molluscan Shellfish.

      (b) MOLLUSCAN SHELLFISH received in interstate commerce shall be from
            sources that are listed in the Interstate Certified Shellfish Shippers List.

      (c) MOLLUSCAN SHELLFISH that are recreationally caught shall not be
            received for sale or service.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114031', 'Game animals', '(a) GAME ANIMALs shall be received from an APPROVED SOURCE.
      (b) A GAME ANIMAL shall not be received for sale or service if it is a species

            of wildlife that is listed in 50 C.F.R. 17 Endangered and Threatened
            Wildlife and Plants or is listed as an endangered or threatened animal by
            the Department of Fish and Game.
      (c) The ENFORCEMENT AGENCY may approve the use of legally obtained
            donated FISH and game by nonprofit organizations authorized to serve

                                               71
            meals to indigent PERSONs.
                  (1) "FISH," as used in this subdivision, shall be defined as that term
                        is used in Section 45 of the Fish and Game Code.
                  (2) "Game," as used in this subdivision, means any game bird, as
                        defined in Section 3500 of the Fish and Game Code, or game
                        mammal, as defined in Section 3950 of the Fish and Game
                        Code.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "3", "article_title": "Food from Approved Sources"}'::jsonb),
  ('CalCode', '114035', 'Inspection upon receipt', '(a) FOOD shall be inspected as soon as practicable upon receipt and prior
            to any use, storage, or resale.

      (b) FOOD shall be accepted only if the inspection conducted upon receipt
            determines that the FOOD satisfies all of the following:
                  (1) Was prepared by and received from APPROVED SOURCEs.
                  (2) Is received in a wholesome condition.
                  (3) Is received in packages that are in good condition and that
                        protect the integrity of the contents so that the FOOD is not
                        exposed to adulteration or potential contaminants.
                  (4) Is in containers and on pallets that are not infested with VERMIN
                        or otherwise contaminated.

      (c) POTENTIALLY HAZARDOUS FOOD shall be inspected for signs of
            spoilage and randomly checked for adherence to the temperature
            requirements as specified in Section 113996.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114037', 'Receiving temperatures', '(a) Except as specified in subdivision (b), refrigerated, POTENTIALLY
            HAZARDOUS FOOD may be at a temperature of 45�F or below when
            received, if the POTENTIALLY HAZARDOUS FOOD is cooled within four
            hours of receipt to a temperature at or below 41�F.

      (b) If a temperature other than 41�F for a POTENTIALLY HAZARDOUS
            FOOD is specified in LAW governing its distribution, the FOOD may be
            received at the specified temperature and cooled as specified in
            subdivisions (d) and (e) of Section 114002.

      (c) Live MOLLUSCAN SHELLFISH shall not be accepted unless received at
            an internal temperature of 45�F or below, or, if received on the date of
            harvest, at a temperature above 45�F.

      (d) POTENTIALLY HAZARDOUS FOOD that is received hot shall be at a
            temperature of 135�F or above.

      (e) A FOOD that is labeled FROZEN and shipped FROZEN by a FOOD
            processing plant shall be received FROZEN and accepted only if there
            are not visible signs of thawing or refreezing.

      (f) Upon receipt, POTENTIALLY HAZARDOUS FOOD shall be free of

                                               72
            evidence of previous temperature abuse.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039', 'Shucked shellfish, packaging and identification', '(a) Raw SHUCKED SHELLFISH shall be obtained in nonreturnable
            packages that bear a legible label that identifies the name, address, and
            certification number of the shucker-packer or repacker of the
            MOLLUSCAN SHELLFISH, and a "sell by" date or a "best if used by" date
            for packages with a capacity of less than one-half gallon, or the date
            shucked for packages with a capacity of one-half gallon or more.

      (b) A package of raw SHUCKED SHELLFISH that does not bear a label or
            that bears a label that does not contain all the information required by
            subdivision (a) shall be subject to IMPOUND pursuant to Section 114393.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039.1', 'Shellstock identification', '(a) SHELLSTOCK shall be obtained in containers bearing legible source
            identification tags or labels that are affixed by the harvester or each dealer
            that depurates, ships, or reships the SHELLSTOCK. Except as specified
            by subdivision (c), on the harvesters or dealer''s tag or label, the following
            information shall be listed in the following order:
                  (1) The harvesters or dealer''s name and address.
                  (2) The harvester''s certification number as assigned by the
                        authority and the original SHELLSTOCK shipper''s certification
                        number.
                  (3) The date of harvesting.
                  (4) The most precise identification of the harvest location or
                        aquaculture site that is practicable based on the system of
                        harvest area designations that is in use by the SHELLFISH
                        CONTROL AUTHORITY and including the abbreviation of the
                        name of the state or country in which the shellfish are harvested.
                  (5) The type and quantity of shellfish.
                  (6) The following statement in bold, capitalized type: "THIS TAG IS
                        REQUIRED TO BE ATTACHED UNTIL CONTAINER IS
                        EMPTY OR RETAGGED AND THEREAFTER KEPT ON FILE
                        FOR 90 DAYS."
                  (7) The dealer''s tag or label shall also indicate the original shipper''s
                        certification number, including the abbreviation of the name of
                        the state or country in which the shellfish are harvested.

      (b) A container of SHELLSTOCK that does not bear a tag or label or that
            bears a tag or label that does not contain all the information required
            under subdivision (a) shall be subject to IMPOUND pursuant to Section
            114393.

      (c) If the harvester''s tag or label is designed to accommodate each dealer''s
            identification, individual dealer tags or labels need not be provided.

                                               73', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039.2', 'Shellstock, condition', 'When received by a FOOD FACILITY, SHELLSTOCK shall be
reasonably free of mud, dead shellfish, and shellfish with broken shells. Dead
shellfish or SHELLSTOCK with badly broken shells shall be discarded.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039.3', 'Molluscan shellfish, original container', '(a) Except as specified in subdivisions (b) and (c), MOLLUSCAN
            SHELLFISH shall not be removed from the container in which they are
            received other than immediately before sale or preparation for service.

      (b) SHELLSTOCK may be removed from the container in which they are
            received and displayed on drained ice or held in a display container. A
            quantity specified by a CONSUMER may be removed from the display or
            display container and provided to the CONSUMER if the source of the
            SHELLSTOCK on display is identified as specified under Section
            114039.1 and recorded as specified under Section 114039.4 and the
            SHELLSTOCK are protected from contamination.

      (c) SHUCKED SHELLFISH may be removed from the container in which
            they were received and held in a display container from which individual
            servings are dispensed upon a CONSUMER''s request if the labeling
            information for the shellfish on display as specified under Section 114039
            is retained and correlated to the date when, or dates during which, the
            shellfish are sold or served and the shellfish are protected from
            contamination.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039.4', 'Shellstock, maintaining identification', '(a) Except as specified by subdivision (b), SHELLSTOCK tags shall remain
            attached to the container in which the SHELLSTOCK are received until
            the container is empty.

      (b) The identity of the source of SHELLSTOCK that are sold or served shall
            be maintained for 90 calendar days from the dates of harvest by using an
            APPROVED recordkeeping system that keeps the tags or labels in
            chronological order correlated to the date or dates the SHELLSTOCK are
            sold or served.

      (c) Notwithstanding subdivision (b), if SHELLSTOCK are removed from their
            tagged or labeled container, the identity of the source of SHELLSTOCK
            that are sold or served shall be maintained by doing the following:
                  (1) Using a recordkeeping system as required under subdivision
                        (b).
                  (2) Ensuring that SHELLSTOCK from one tagged or labeled
                        container are not COMMINGLEd with SHELLSTOCK from
                        another container with different certification numbers, harvest
                        dates, or growing areas as identified on the tag or label before
                        being ordered by the CONSUMER.
                  (3) If SHELLSTOCK are portioned and prepackaged, including a

                                               74
                        copy of the corresponding SHELLSTOCK tag or properly
                        labeling the package with the required shellfish information.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114039.5', 'Molluscan shellfish tanks', '(a) Except as specified in subdivision (b), MOLLUSCAN SHELLFISH life-
            support system display tanks shall not be used to display shellfish that
            are offered for human consumption and shall be conspicuously marked
            so that it is obvious to the CONSUMER that the shellfish are for display
            only.

      (b) MOLLUSCAN SHELLFISH life support system display tanks that are
            used to store and display shellfish that are offered for human
            consumption shall be operated and maintained in accordance with an
            HACCP PLAN as specified in Section 114419.1. Operation and
            maintenance shall ensure the following:
                  (1) Water used with FISH other than MOLLUSCAN SHELLFISH
                        does not flow into the molluscan tank.
                  (2) The safety and quality of the shellfish as they were received are
                        not compromised by the use of the tank.
                  (3) The identity of the source of the SHELLSTOCK is retained as
                        specified in Section 114039.4.

      (c) MOLLUSCAN SHELLFISH life support system display tanks that were in
            operation prior to the effective date of this part need not comply with
            Section 114419.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114041', 'Shell eggs', '(a) Shell EGGs shall be received clean and sound.
      (b) Shell EGGs shall not exceed the restricted EGG tolerances for United

            States Consumer Grade B Standards.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "4", "article_title": "Receipt of Food"}'::jsonb),
  ('CalCode', '114047', 'Food storage, adequate space', '(a) Adequate and suitable space shall be provided for the storage of FOOD.
      (b) Except as specified in subdivisions (c), (d), and (e), FOOD shall be

            protected from contamination by storing the FOOD in a clean, dry
            location, where it is not exposed to splash, dust, VERMIN, or other forms
            of contamination or adulteration, and at least six inches above the floor.
      (c) FOOD in packages and working containers may be stored less than six
            inches above the floor on case lot handling EQUIPMENT as specified
            under Section 114165.
      (d) Pressurized BEVERAGE containers, cased FOOD in waterproof
            containers such as bottles or cans, and milk containers in plastic crates
            may be stored on a floor that is clean and not exposed to moisture.

                                               75
      (e) Temporary alternate FOOD storage methods and locations may be
            approved by the local ENFORCEMENT AGENCY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "5", "article_title": "Food Storage"}'::jsonb),
  ('CalCode', '114049', 'Food storage, prohibited areas', 'FOOD shall not be stored in any of the following ways:
      (a) In locker rooms.
      (b) In toilet rooms.
      (c) In dressing rooms.
      (d) In REFUSE rooms.
      (e) In mechanical rooms.
      (f) Under sewer lines that are not shielded to intercept potential drips.
      (g) Under leaking water lines, including leaking automatic fire sprinkler

            heads, or under lines on which water has condensed.
      (h) Under open stairwells.
      (i) Under other sources of contamination.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "5", "article_title": "Food Storage"}'::jsonb),
  ('CalCode', '114051', 'Food storage containers identified with common name of food', 'Working containers holding FOOD or FOOD ingredients that are removed
from their original packages for use in the FOOD FACILITY, such as cooking oils,
flour, herbs, potato flakes, salt, spices, and sugar, shall be identified with the
common name of the FOOD, except that containers holding FOOD that can be
readily and unmistakably recognized, such as dry pasta, need not be identified.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "5", "article_title": "Food Storage"}'::jsonb),
  ('CalCode', '114053', 'Storage or display of food in contact with water or ice', '(a) PREPACKAGED FOOD may not be stored in direct contact with ice or
            water if the FOOD is subject to the entry of water because of the nature
            of its packaging, wrapping, or container, or its positioning in the ice or
            water.

      (b) Except as specified in subdivisions (c) and (d) nonPREPACKAGED
            FOOD may not be stored in direct contact with undrained ice.

      (c) Whole raw fruits or vegetables, cut raw vegetables, and tofu may be
            immersed in ice or water.

      (d) Raw chicken and raw FISH that are received immersed in ice in shipping
            containers may remain in that condition while in storage awaiting
            preparation, display, service, or sale.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "5", "article_title": "Food Storage"}'::jsonb),
  ('CalCode', '114055', 'Segregation and location of distressed merchandise', '(a) Products that are held by the PERMIT HOLDER for credit, redemption,
            or return to the distributor, such as damaged, spoiled, or recalled
            products, shall be segregated and held in designated areas that are
            separated from FOOD, EQUIPMENT, UTENSILs, LINENS, and SINGLE-
            USE ARTICLES.

                                               76
      (b) All returned or damaged FOOD products and FOOD products from which
            the label has been removed shall be separated and stored in a separate
            area and in a manner that shall prevent adulteration of other FOODs and
            shall not contribute to a VERMIN problem.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "5", "article_title": "Food Storage"}'::jsonb),
  ('CalCode', '114057', 'Reduced oxygen packaging', '(a) POTENTIALLY HAZARDOUS FOODs that are packed by the FOOD
            FACILITY in reduced-oxygen packaging or have been partially cooked
            and SEALED in any container or configuration that creates anaerobic
            conditions shall be plainly date coded. The date coding shall state "Use
            By," followed by the appropriate month, day, and year.

      (b) For purposes of this section, "partially cooked" means POTENTIALLY
            HAZARDOUS FOODs that have not been sufficiently cooked to assure
            commercial sterility or fail to have barriers to prevent the growth of or toxin
            formation by Clostridium botulinum.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "6", "article_title": "Specialized Processing Methods"}'::jsonb),
  ('CalCode', '114057.1', 'Reduced oxygen packaging, criteria', '(a) A FOOD FACILITY that packages FOOD using a REDUCED-OXYGEN
            PACKAGING method and Clostridium botulinum is identified as a
            microbiological HAZARD in the final prepackaged form shall ensure that
            there are at least two barriers in place to control the growth and toxin
            formation of Clostridium botulinum.

      (b) A FOOD FACILITY that packages FOOD using a REDUCED-OXYGEN
            PACKAGING method and Clostridium botulinum is identified as a
            microbiological HAZARD in the final prepackaged form shall have an
            APPROVED HACCP PLAN that does all of the following:
                  (1) Contains the information specified under Section 114419.1.
                  (2) Identifies the FOOD to be prepackaged.
                  (3) Limits the FOOD prepackaged to a FOOD that does not support
                        the growth of Clostridium botulinum because it complies with
                        one of the following:
                        (A) Has an aw of 0.91 or less.
                        (B) Has a pH of 4.6 or less.
                        (C) Is a MEAT or POULTRY product cured at a FOOD
                              processing plant regulated by the United States
                              Department of Agriculture and is received in an intact
                              package.
                        (D) Is a FOOD with a high level of competing organisms, such
                              as raw MEAT or raw POULTRY.
                  (4) Specifies methods for maintaining FOOD at 41�Fahrenheit or
                        below.
                  (5) Describes how the packages shall be prominently and

                                               77
                        conspicuously labeled on the principal display panel in bold type
                        on a contrasting background, with instructions to maintain the
                        FOOD at 41�F or below and discard the FOOD if within 30
                        calendar days of its packaging it is not served for on-PREMISES
                        consumption, or consumed if served or sold for off-PREMISES
                        consumption.
                  (6) Limits the refrigerated shelf life to no more than 30 calendar
                        days from packaging to consumption, except the time product is
                        maintained FROZEN, or the original manufacturer''s "sell by" or
                        "use by" date, whichever occurs first.
                  (7) Includes operational procedures that prohibit contacting FOOD
                        with bare hands, identify a designated area and the method by
                        which physical barriers or methods of separation of raw FOODs
                        and READY-TO-EAT FOODs minimize cross-contamination
                        and access to the processing EQUIPMENT is restricted to
                        responsible trained personnel familiar with the potential
                        HAZARDs of the operation, and delineate cleaning and
                        SANITIZATION procedures for FOOD-CONTACT SURFACEs.
                  (8) Describes the training program that ensures that individuals
                        responsible for the REDUCED-OXYGEN PACKAGING
                        operation understand the concepts required for a safe operation,
                        the EQUIPMENT and facilities, and the procedures specified
                        under paragraph (7) and Section 114419.1.
      (c) Except for FISH that is FROZEN before, during, and after packaging, a
            FOOD FACILITY shall not package FISH using a reduced-oxygen
            packaging method.
      (d) A FOOD FACILITY is not required to have an HACCP plan in the FOOD
            FACILITY uses a REDUCED-OXYGEN PACKAGING method to package
            hazardous FOOD that always complies with the following standards with
            respect to packaging the hazardous FOOD:
                  (1) The FOOD is labeled with the production time and date.
                  (2) The FOOD is held at 41 degrees Fahrenheit or lower during
                        refrigerated storage.
                  (3) The FOOD is removed from its package in the FOOD FACILITY
                        within 48 hours after packaging.
      (e) A FOOD FACILITY that packages POTENTIALLY HAZARDOUS FOODs
            using a cook-chill or sous vide process shall meet the requirements of
            Section 3-502.12 (D) of the Food Code published by the FDA.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "6", "article_title": "Specialized Processing Methods"}'::jsonb),
  ('CalCode', '114060', 'Food display', '(a) Except for nuts in the shell and whole raw fruits and vegetables that are
            intended for hulling, peeling, or washing by the CONSUMER before
            consumption, FOOD on display shall be protected from contamination by

                                               78
            the use of packaging, counter, service line, or sneeze guards that
            intercept a direct line between the CONSUMER''s mouth and the FOOD
            being displayed, containers with TIGHT-FITTING securely attached lids,
            display cases, mechanical dispensers, or other effective means.
      (b) NonPREPACKAGED FOOD may be displayed and sold in bulk in other
            than self-service containers if both of the following conditions are
            satisfied:

                  (1) The FOOD is served by a FOOD EMPLOYEE directly to a
                        CONSUMER.

                  (2) The FOOD is displayed in clean, sanitary, and covered, or
                        otherwise protected, containers.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114063', 'Consumer self-service operations', '(a) Raw, nonPREPACKAGED FOOD of animal origin, such as beef, lamb,
            pork, POULTRY, and eviscerated FISH, shall not be offered for
            CONSUMER self-service. This subdivision does not apply to the
            following:
                  (1) CONSUMER self-service of READY-TO-EAT FOODs at buffets
                        or salad bars that serve FOODs such as sushi or raw shellfish.
                  (2) Ready-to-cook individual portions for immediate cooking and
                        consumption on the PREMISES, such as CONSUMER-cooked
                        MEATs or CONSUMER-selected ingredients for Mongolian
                        barbecue, or raw, FROZEN shrimp, lobster, finfish, or scallop
                        abductor muscle, or FROZEN breaded seafood.

      (b) NonPREPACKAGED FOOD may be displayed in bulk for CONSUMER
            self-service if all of the following conditions are satisfied:
                  (1) PRODUCE and FOOD requiring further processing, except raw
                        FOOD of animal origin, may be displayed on open counters or
                        in containers.
                  (2) Except for salad bar and buffet-type FOOD service, a label shall
                        be conspicuously displayed in plain view of the CONSUMER
                        and securely attached to each self-service container, or in clear
                        relationship to it, and shall contain the information required in
                        Section 114089.
                  (3) NonFOOD items shall be displayed and stored in an area
                        separate from FOOD.

      (c) French style, hearth-baked, or hard-crusted loaves and rolls shall be
            considered properly wrapped if contained in an open-end bag of sufficient
            size to enclose the loaves or rolls.

      (d) CONSUMER self-service operations for READY-TO-EAT FOODs such
            as buffets and salad bars shall be provided with a suitable FOOD
            dispensing UTENSIL for each container displayed or effective dispensing
            methods that protect the FOOD from contamination.

      (e) CONSUMER self-service operations such as buffets and salad bars shall
            be checked periodically on a regular basis by FOOD EMPLOYEEs
            trained in safe operating procedures.

                                               79', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114065', 'Consumer self-service bulk beverage dispensing operations', 'Notwithstanding Section 114266, this section shall not be construed to
require the enclosure, during operating hours, of CONSUMER self-service
nonPOTENTIALLY HAZARDOUS bulk BEVERAGE dispensing operations that
meet the following requirements:

      (a) The dispensing operation is installed contiguous with a PERMANENT
            FOOD FACILITY and is operated by the FOOD FACILITY.

      (b) The BEVERAGEs are dispensed from enclosed EQUIPMENT that
            precludes exposure of the BEVERAGEs until they are dispensed at the
            nozzles. The dispensing EQUIPMENT actuating lever or mechanism and
            filling device of CONSUMER self-service BEVERAGE dispensing
            EQUIPMENT shall be designed to prevent contact with the lip-contact
            surface of glasses or cups that are refilled.

      (c) Ice and ice product are dispensed only from an ice product dispenser. Ice
            and ice product are not scooped or manually loaded into a dispenser out-
            of-doors.

      (d) Single-use UTENSILs are protected from contamination and are
            individually wrapped or dispensed from APPROVED sanitary dispensers.

      (e) The dispensing operations have overhead protection that fully extends
            over all EQUIPMENT associated with the facility.

      (f) During nonoperating hours the dispensing operations are fully enclosed
            so as to be protected from contamination by VERMIN and exposure to
            the elements.

      (g) The PERMIT HOLDER of the PERMANENT FOOD FACILITY
            demonstrates to the ENFORCEMENT AGENCY that adequate methods
            are in place to properly clean and sanitize the BEVERAGE dispensing
            EQUIPMENT.

      (h) BEVERAGE dispensing operations are in compliance with Section
            113980 and have been APPROVED by the ENFORCEMENT AGENCY.

      (i) BEVERAGE dispensing operations are under the constant and complete
            control of the PERSON IN CHARGE of the PERMANENT FOOD
            FACILITY who is operating the dispensing EQUIPMENT.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114067', 'Satellite food service', '(a) SATELLITE FOOD SERVICE is restricted to LIMITED FOOD
            PREPARATION.

      (b) SATELLITE FOOD SERVICE shall only be operated by a fully enclosed
            PERMANENT FOOD FACILITY that meets the requirements for FOOD
            PREPARATION and service and that is responsible for servicing the
            SATELLITE FOOD SERVICE operation.

      (c) Before conducting SATELLITE FOOD SERVICE, the PERMITHOLDER
            of the PERMANENT FOOD FACILITY shall submit to the
            ENFORCEMENT AGENCY written standard operating procedures that
            include all of the following information:

                                               80
            (1) All FOOD products that will be handled and dispensed.
            (2) The proposed procedures and methods of FOOD

                  PREPARATION and handling.
            (3) Procedures, methods, and schedules for cleaning UTENSILs,

                  EQUIPMENT, structures, and for the disposal of REFUSE.
            (4) How FOOD will be transported to and from the PERMANENT

                  FOOD FACILITY and the SATELLITE FOOD SERVICE
                  operation, and procedures to prevent contamination of FOODs.
            (5) How POTENTIALLY HAZARDOUS FOODs will be maintained
                  in accordance with Section 113996.
(d) All FOOD PREPARATION shall be conducted within a FOOD
      COMPARTMENT or fully enclosed facility APPROVED by the
      ENFORCEMENT OFFICER.
(e) SATELLITE FOOD SERVICE areas shall have overhead protection that
      extends over all FOOD handling areas.
(f) SATELLITE FOOD SERVICE operations that handle
      nonPREPACKAGED FOOD shall be equipped with APPROVED
      handwashing facilities and WAREWASHING facilities that are either
      permanently plumbed or self-contained.
(g) Notwithstanding subdivision (f), the local ENFORCEMENT AGENCY
      may approve the use of alternative WAREWASHING facilities.
(h) During nonoperating hours and periods of inclement weather, FOOD,
      FOOD-CONTACT SURFACEs, and UTENSILs shall be stored within any
      of the following:
            (1) A fully enclosed SATELLITE FOOD SERVICE operation.
            (2) APPROVED FOOD COMPARTMENTs where FOOD, FOOD
                  contact surfaces, and UTENSILs are protected at all times from
                  contamination, exposure to elements, ingress of VERMIN, and
                  temperature abuse.
            (3) A fully enclosed PERMANENT FOOD FACILITY.
(i) SATELLITE FOOD SERVICE activities shall be conducted by and under
      the constant and complete control of the PERMITHOLDER of the fully
      enclosed PERMANENT FOOD FACILITY, or the duly contracted
      personnel of, or third-party providers to, the PERMIT HOLDER.
(j) For purposes of permitting and ENFORCEMENT, the PERMIT HOLDER
      of the PERMANENT FOOD FACILITY and the PERMIT HOLDER of the
      SATELLITE FOOD SERVICE shall be the same.
(k) A PERMITted FOOD FACILITY within any local jurisdiction that is subject
      to RETAIL FOOD operation restrictions related to a COVID-19 public
      health response may prepare and serve FOOD as a temporary
      SATELLITE FOOD SERVICE without obtaining a separate SATELLITE
      FOOD SERVICE PERMIT or submitting written operating procedures
      pursuant to subdivision (c). The written operating procedures shall be
      maintained onsite for review, upon request, by the local jurisdiction.

                                          81', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114069', 'Outdoor food displays', 'Only PREPACKAGED nonPOTENTIALLY HAZARDOUS FOOD or uncut
PRODUCE may be displayed or sold outdoors by a FOOD FACILITY if all of the
following conditions are satisfied:

      (a) Outdoor displays have overhead protection that extends over all FOOD
            items.

      (b) FOOD items from the outdoor display are stored inside the fully enclosed
            FOOD FACILITY at all times other than during business hours.

      (c) Outdoor displays comply with Section 113980 and have been
            APPROVED by the ENFORCEMENT AGENCY.

      (d) Outdoor displays are under the control of the PERMIT HOLDER of the
            fully enclosed FOOD FACILITY and are checked periodically on a regular
            basis.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114073', 'Single-use articles, use limitation', 'Bulk milk container dispensing tubes shall be cut on the diagonal leaving
no more than one inch protruding from the chilled dispensing head.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114074', 'Preset tableware', 'If TABLEWARE is preset, exposed, and unused, extra settings shall
either be removed when a CONSUMER is seated or cleaned and sanitized before
further use.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114075', 'Using clean tableware for second portions and refills', '(a) Except for refilling a CONSUMER''s drinking cup or container without
            contact between the pouring UTENSIL and the lip-contact area of the
            drinking cup or container, FOOD EMPLOYEEs shall not use
            TABLEWARE, including SINGLE-USE ARTICLES, soiled by the
            CONSUMER, to provide second portions or refills.

      (b) Except as specified in subdivision (d), self-service CONSUMERs shall
            not be allowed to use soiled TABLEWARE, including SINGLE-USE
            ARTICLES, to obtain additional FOOD from the display and serving
            EQUIPMENT.

      (c) CONSUMERs shall be notified that clean TABLEWARE is to be used
            when they return to self-service areas such as salad bars and buffets.

      (d) Drinking cups and containers may be reused by self-service
            CONSUMERs if refilling of a CONSUMER''s drinking cup is done without
            contact between the pouring UTENSIL and the lip contact area of the cup
            or container.

      (e) Personal take-out BEVERAGE containers, such as thermally insulated
            bottles, nonspill coffee cups, and promotional BEVERAGE glasses, may
            be refilled by EMPLOYEEs or the CONSUMER if refilling is a
            contamination-free process as specified in subdivision (a).

                                               82', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114077', 'Condiments, protection', 'CONDIMENTs shall be protected from contamination by being kept in
dispensers that are designed to provide protection, protected FOOD displays
provided with the proper UTENSILs, original containers designed for dispensing,
or individual packages or portions.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114079', 'Returned food and re-service of food', '(a) Except as specified in subdivision (b) and (c), after being served or sold
            and in the possession of a CONSUMER, FOOD that is unused or
            returned by the CONSUMER shall not be offered as FOOD for human
            consumption.

      (b) A container of FOOD that is not POTENTIALLY HAZARDOUS may be
            transferred from one CONSUMER to another if the FOOD is dispensed
            so that it is protected from contamination and the container is closed
            between uses, such as a narrow-neck bottle containing catsup, steak
            sauce, or wine, or if the FOOD, such as crackers, salt, or pepper, is in an
            unopened original package and is maintained in sound condition, and if
            the FOOD is checked periodically on a regular basis.

      (c)
                  (1) A local educational agency may do both of the following to
                        minimize waste and to reduce food insecurity:
                                    (A) Provide sharing tables where FOOD service staff,
                                          pupils, and faculty may return appropriate FOOD
                                          items consistent with subparagraph (B) and make
                                          those FOOD items available to pupils during the
                                          course of a regular school meal time.
                                    (B) Allow the FOOD placed on the sharing tables that
                                        is not taken by a pupil during the course of a regular
                                        school meal time in accordance with subparagraph
                                        (A) to be donated to a FOOD BANK or any other
                                        NONPROFIT CHARITABLE ORGANIZATION.
                        (2) Donations of FOOD or FOOD made available to pupils during
                              the course of a regular school meal time pursuant to
                              paragraph (1) may include prepackaged,
                              nonPOTENTIALLY HAZARDOUS FOOD with the
                              packaging still intact and in good condition, whole uncut
                              PRODUCE that complies with Section 113992 before
                              donation, unopened bags of sliced fruit, unopened
                              containers of milk that are immediately stored in a cooling
                              bin maintained at 41 degrees Fahrenheit or below, and
                              perishable prepackaged FOOD if it is placed in a proper
                              temperature-controlled environment.
                        (3) When a local educational agency, pursuant to paragraph (1),
                            makes FOOD available to pupils during the course of a

                                               83
                            regular school meal time or donates FOOD to a FOOD bank
                            or any other NONPROFIT CHARITABLE ORGANIZATION
                            for distribution, the preparation, safety, and donation of
                            FOOD shall be consistent with Section 113980.
                        (4) For purposes of this subdivision, "local educational agency"
                            means a county office of education, school district, or charter
                            school.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114081', 'Handling of kitchenware and tableware', '(a) SINGLE-USE ARTICLES and cleaned and sanitized MULTISERVICE
            UTENSILs shall be handled, displayed, and dispensed so that
            contamination of FOOD and lip-contact surfaces is prevented.

      (b) Knives, forks, and spoons that are not prewrapped shall be presented so
            that only the handles are touched by EMPLOYEEs, and by CONSUMERs
            if CONSUMER self-service is provided.

      (c) Except as specified under subdivision (b), SINGLE-USE ARTICLES that
            are intended for FOOD or lip-contact shall be furnished for CONSUMER
            self-service with the original individual wrapper intact or from an
            APPROVED dispenser.

      (d) SINGLE-USE ARTICLES shall not be reused.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114083', 'Soiled and clean tableware', 'Soiled TABLEWARE shall be removed from CONSUMER eating and
drinking areas and handled so that clean TABLEWARE, FOOD, and FOOD-
CONTACT SURFACEs are not contaminated.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "7", "article_title": "Food Display and Service"}'::jsonb),
  ('CalCode', '114087', 'Honestly presented', '(a) FOOD offered for human consumption shall be honestly presented in a
            way that does not mislead or misinform the CONSUMER.

      (b) FOOD or color ADDITIVEs, colored overwraps, lights or other misleading
            artificial means shall not be used to misrepresent the true appearance,
            color, or quality of a FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114088', 'Cottage food product', 'A cottage FOOD product, as defined in Section 113758, that is served by
a FOOD FACILITY without packaging or labeling, as described in Section 114365,
shall be identified to the CONSUMER as homemade on the menu, menu board, or

                                               84
other location that would reasonably inform a CONSUMER of its homemade
status.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114089', 'Labeling', '(a) FOOD prepackaged in a FOOD FACILITY shall bear a label that complies
            with the labeling requirements prescribed by the Sherman Food, Drug,
            and Cosmetic Law (Part 5 (commencing with Section 109875)), 21 C.F.R.
            101-Food Labeling, 9 C.F.R. 317-Labeling, Marking Devices, and
            Containers, and 9 C.F.R. 381-Subpart N Labeling and Containers, and
            as specified under Sections 114039 and 114039.1.

      (b) Label information shall include the following:
                  (1) The common name of the FOOD, or absent a common name,
                        an adequately descriptive identity statement.
                  (2) If made from two or more ingredients, a list of ingredients in
                        descending order of predominance by weight, including a
                        declaration of artificial color or flavor and chemical
                        preservatives, if contained in the FOOD.
                  (3) An accurate declaration of the quantity of contents.
                  (4) The name and place of business of the manufacturer, packer, or
                        distributor.
                  (5) Except as exempted in the Federal Food, Drug, and Cosmetic
                        Act Section 403(Q)(3)-(5) (21 U.S.C. Sec. 343(q)(3)-(5), incl.),
                        nutrition labeling as specified in 21 C.F.R. 101-Food Labeling
                        and 9 C.F.R. 317 Subpart B Nutrition Labeling.

      (c) Bulk FOOD that is available for CONSUMER self-service shall be
            prominently labeled with either of the following in plain view of the
            CONSUMER:
                  (1) The manufacturer''s or processor''s label that was provided with
                        the FOOD.
                  (2) A card, sign, or other method of notification that includes the
                        information specified under paragraphs (1), (2), and (5) of
                        subdivision (b).', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114089.1', 'Bakery products, labeling', '(a) Except as specified in subdivision (c) of Section 114089, every bakery
            product shall have a protective wrapping that shall bear a label that
            complies with the labeling requirements prescribed by the Sherman
            Food, Drug, and Cosmetic Law (Part 5(commencing with Section
            109875)).

      (b) Bakery products sold directly to a restaurant, catering service, RETAIL
            bakery, or sold over the counter directly to the CONSUMER by the
            manufacturer or bakery distributor shall be exempt from the labeling
            provisions of this section.

      (c) French style, hearth-baked, or hard-crusted loaves and rolls shall be
            considered properly wrapped if contained in an open-end bag that

                                               85
            encloses the loaves or rolls.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114090', 'Other forms of information', '(a) If required by LAW, CONSUMER warnings shall be provided.
      (b) FOOD FACILITY''s or manufacturer''s dating information on FOODs may

            not be concealed or altered.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114091', 'Highly susceptible population�pasteurized foods, prohibited', 'reservice and prohibited food

            In a licensed health care facility and a public or private school cafeteria,
the following shall apply:

      (a) Only pasteurized JUICE may be served.
      (b) Only pasteurized fluid and dry milk and milk products complying with

            GRADE A STANDARDS as specified in LAW shall be served.
      (c) Pasteurized shell EGGs or pasteurized liquid, FROZEN, or dry EGGs or

            EGG products shall be substituted for raw shell EGGs in the preparation
            of FOODs such as Caesar salad, hollandaise or b�arnaise sauce,
            mayonnaise, EGGnog, ice cream, and EGG-fortified BEVERAGEs, and,
            except as specified in subdivision (e), recipes in which more than one
            EGG is broken and the EGGs are combined.
      (d)

                  (1) FOOD shall not be reserved where the FOOD was already
                        served to patients or clients who are under contact precautions
                        in medical isolation or quarantine or protective environment
                        isolation.

                  (2) FOOD shall not be reserved to a patient or client in protective
                        environment isolation.

      (e) The following FOODs may not be served or offered for sale in a READY-
            TO-EAT form:
                  (1) Raw FOODs of animal origin such as raw FISH, raw-marinated
                        FISH, raw MOLLUSCAN SHELLFISH, and steak tartare.
                  (2) A partially cooked FOOD of animal origin, such as lightly cooked
                        FISH, rare MEAT, soft-cooked EGGs, that is made from raw
                        shell EGGs, and meringue.
                  (3) Raw seed sprouts.

      (f) Subdivision (c) does not apply in any of the following instances:
                  (1) The raw EGGs are combined immediately before cooking for
                        one CONSUMER''s serving at a single meal, cooked as specified
                        under Section 114004, and served immediately, such as an
                        omelet, souffle, or scrambled EGGs.
                  (2) The raw EGGs are combined as an ingredient immediately
                        before baking and the EGGs are thoroughly cooked to a
                        READY-TO-EAT form, such as a cake, muffin, or bread.
                  (3) The preparation of the FOOD is conducted under a HACCP
                        PLAN that:

                                               86
                        (A) Identifies the FOOD to be prepared.
                        (B) Prohibits contacting READY-TO-EAT FOOD with bare

                              hands.
                        (C) Includes specifications and practices that ensure

                              salmonella enteritidis growth is controlled before and after
                              cooking and is destroyed by cooking the EGGs to an
                              internal temperature of 145�F.
                        (D) Contains the information specified under a HACCP PLAN,
                              including procedures that control cross-contamination of
                              READY-TO-EAT FOOD with raw EGGs, and delineate
                              cleaning and SANITIZATION procedures for FOOD-
                              CONTACT SURFACEs.
                        (E) Describes the training program that ensures that the FOOD
                              EMPLOYEE responsible for the preparation of the FOOD
                              understands the procedures to be used.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114093', 'Consumer advisory, less than thoroughly cooked', '(a) Except as specified in subdivision (c) and paragraph (2) of subdivision (d)
            of Section 114004 and pursuant to subdivision (e) of Section 114091, if
            an animal FOOD, including beef, EGGs, FISH, lamb, milk, pork,
            POULTRY, or shellfish, is served or sold raw, undercooked, or without
            otherwise being processed to eliminate pathogens, either in READY-TO-
            EAT form or as an ingredient in another READY-TO-EAT FOOD, the
            PERMIT HOLDER shall inform consumers of the significantly increased
            risk of consuming those FOODs by way of a disclosure pursuant to
            subdivision (b) and reminder pursuant to subdivision (c), using brochures,
            deli case or menu advisories, label statements, table tents, placards, or
            other effective written means.

      (b) "Disclosure" means a written statement that clearly includes either of the
            following:
                  (1) A description of the animal-derived FOODs, such as "oysters on
                        the half shell (raw oysters)," "raw-EGG Caesar salad," and
                        "hamburgers (can be cooked to order)."
                  (2) Identification of the animal-derived FOODs marked by an
                        asterisk denoting a footnote that states that the items are served
                        raw or undercooked, or contain or may contain raw or
                        undercooked ingredients.

      (c) "Reminder" means a written statement that identifies the animal-derived
          FOODs by an asterisk that denotes a footnote that includes either of the
          following disclosure statements:
                  (1) Written information regarding the safety of these FOOD items is
                        available upon request.
                  (2) Consuming raw or undercooked meats, POULTRY, seafood,
                        shellfish, or EGGs may increase your risk of foodborne illness,
                        especially if you have certain medical conditions.

                                               87', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114093.1', 'Confectionary containing alcohol, notice to consumer', '(a) Any FOOD FACILITY that serves or sells over the counter directly to the
            CONSUMER an unlabeled or nonPREPACKAGED FOOD that is a
            confectionery that contains alcohol in excess of one-half of 1 percent by
            weight shall provide written notice to the CONSUMER of that fact.

      (b) The notice shall be prominently displayed or be provided in some other
            manner, as determined by the DEPARTMENT.

      (c) The DEPARTMENT shall adopt regulations to govern the notice required
            by this section in order to effectuate the purposes of this section.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114093.5', 'Major food allergens, notice to consumer', '(a) Commencing July 1, 2026, a FOOD FACILITY that is subject to
            Section 343(q)(5)(H) of Title 21 of the United States Code that
            serves or sells FOOD to the consumer shall provide written
            notification of MAJOR FOOD ALLERGENS that the FOOD
            FACILITY knows or reasonably should know are contained as
            ingredients in each menu item. The FOOD FACILITY shall provide
            this information in either of the following manners:
                  (1) Directly on the FOOD FACILITY''s menu. If the FOOD FACILITY
                  elects to provide MAJOR FOOD ALLERGEN information directly on
                  its menu, the menu item shall be followed by a written statement
                  below or immediately adjacent to the menu item indicating the
                  MAJOR FOOD ALLERGENS contained in the menu item.
                  (2)
                        (A) In a digital format, including, but not limited to, using a quick
                              response (QR) code that links to the FOOD FACILITY''s
                              digital menu.
                        (B) If a FOOD FACILITY elects to provide the MAJOR FOOD
                              ALLERGEN information in a digital format, the FOOD
                              FACILITY shall also use an alternative method to provide
                              the information to customers who are not able to access the
                              information in the digital format. For purposes of this
                              subparagraph, "alternative method" includes, but is not
                              limited to, any of the following:
                              (i) A separate allergen-specific menu.
                              (ii) An allergen chart.
                              (iii) An allergen grid.
                              (iv) An allergen booklet.
                              (v) Other written materials.

       (b) A FOOD FACILITY required to provide MAJOR FOOD ALLERGEN
            information pursuant to this section shall use either of the following
            when providing the information:
                  (1) Common or usual names of the MAJOR FOOD ALLERGENS.
                  (2) Standardized pictograms to communicate the presence of
                      MAJOR FOOD ALLERGENS.

                                               88
      (c) An ENFORCEMENT AGENCY may utilize either of the following
               methods to evaluate a FOOD FACILITY''s compliance with this
               section:
                  (1) Visual verification of allergen disclosure. An ENFORCEMENT
                        OFFICER may confirm that required allergen statements are
                        displayed on printed menus, digital menus, or the alternative
                        methods described in subparagraph (B) of paragraph (2) of
                        subdivision (a).
                  (2) Other reasonable methods of verification consistent with the
                        intent of this section.

      (d) For purposes of this section, the following definitions apply:
                  (1) "MAJOR FOOD ALLERGEN" has the same meaning as defined
                        in Section 113820.5.
                  (2) "Menu" has the same meaning as "menu or menu board," as
                        defined in Section 101.11 of Title 21 of the Code of Federal
                        Regulations.

      (e) This section does not apply to PREPACKAGED FOODs that are
               subject to federal labeling requirements for MAJOR FOOD
               ALLERGENS pursuant to Section 343 of Title 21 of the United States
               Code.

      (f) This section does not apply to COMPACT MOBILE FOOD
               OPERATIONS, as defined in Section 113831, or NONPERMANENT
               FOOD FACILITIES, as defined in Section 113839.

      (g) This section does not alter any duty that a food facility may have under
               existing law to reasonably ensure the safety of its patrons.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114094', 'Menu labeling and nutritional information', '(a) A FOOD FACILITY subject to Section 343(q)(5)(H) of Title 21 of the
            United States Code or subject to this section as it read on July 1, 2011,
            shall comply with the requirements of that section of the United States
            Code and the regulations adopted pursuant thereto.

      (b) Notwithstanding the Sherman Food, Drug, and Cosmetic Law (Part 5
            (commencing with Section 109875) of Division 104), and to the extent
            permitted by federal law:
                  (1) Enforcement of this section shall be made pursuant to Section
                        113713.
                  (2)
                        (A) A violation of this section is, notwithstanding Section
                              114395, an infraction, punishable by a fine of not less than
                              fifty dollars ($50) nor more than five hundred dollars ($500).
                              A second violation within a five-year period from a prior
                              violation shall be punishable by a fine of not less than one
                              hundred dollars ($100) nor more than one thousand dollars
                              ($1,000). For a third or subsequent violation within a five-
                              year period, the fine shall be not less than two hundred fifty

                                               89
                              dollars ($250) nor more than two thousand five hundred
                              dollars ($2,500). A FOOD FACILITY shall not be found to
                              have committed a violation under this paragraph more than
                              once during an inspection visit.
                        (B) Alternatively, the ENFORCEMENT AGENCY may assess a
                              civil penalty of an amount that is no less than or greater than
                              the amounts specified for fines in this paragraph.
      (c) Except for the civil penalties authorized by this section, this section shall
            not be construed to create or enhance any claim, right of action, or civil
            liability that did not exist under state law prior to January 1, 2009, or limit
            any claim, right of action, or civil liability that otherwise existed under state
            law prior to January 1, 2009. The only enforcement mechanism of this
            section is the department or local enforcement agency, as set forth in
            Section 113713.
      (d) This section shall become operative only on and after the compliance
            date specified in the federal regulation implementing Section 343(q)(5)(H)
            of Title 21 of the United States Code.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114094.5', 'Infant formula and baby food "use by" dates', '(a) A RETAIL FOOD FACILITY shall not sell or offer for sale after the "use
            by" date, infant formula or baby FOOD that is required to have this date
            on its packaging pursuant to the federal act, as defined in Section
            109930, and federal regulations adopted pursuant to the federal act,
            including, but not limited to, Section 107.20 of Title 21 of the Code of
            Federal Regulations.

       (b) Notwithstanding Section 114395, any RETAIL FOOD FACILITY that
            violates this section is guilty of an infraction, punishable by a fine of not
            more than ten dollars ($10) per day for each item sold or offered for sale
            after the "use by" date. The fine shall be calculated based upon the
            number of days past the "use by" date that the product is either found
            being offered for sale, or if the product is sold, the date of sale as
            established by evidence of the proof of purchase, including, but not
            limited to, a sales receipt.

         (c) An ENFORCEMENT AGENCY may assess administrative penalties on
            a RETAIL FOOD FACILITY that violates this section in the amount of ten
            dollars ($10) per day for each item sold or offered for sale, in addition to
            other penalties authorized by law.

        (d) For purposes of this section, the following definitions shall apply:
                  (1) "Baby food" shall have the meaning given to "baby foods" in
                        paragraph (c) of Section 407.81 of Title 40 of the Code of
                        Federal Regulations.
                  (2) "Infant formula" shall have the meaning given in subdivision (z)
                        of Section 321 of Title 21 of the United States Code.

                                               90', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "4", "chapter_title": "General Food Safety Provisions", "article": "8", "article_title": "Consumer Information"}'::jsonb),
  ('CalCode', '114095', 'Warewashing facilities', 'All FOOD FACILITIES in which FOOD is prepared or in which
MULTISERVICE UTENSILs and EQUIPMENT are used shall provide manual
methods to effectively clean and sanitize UTENSILs as specified in Section
114099.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114097', 'Manual or mechanical warewashing', 'EQUIPMENT FOOD-CONTACT SURFACEs and MULTISERVICE
UTENSILs shall be effectively washed to remove or completely loosen soils by the
use of manual or mechanical methods necessary, such as the application of
detergents containing wetting agents and emulsifiers, acid, alkaline, or abrasive
cleaners, hot water, brushes, scouring pads, high pressure sprays, or ultrasonic
devices.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099', 'Manual warewashing, sink compartment requirements', '(a) Manual WAREWASHING sinks, except as specified in subdivision (c),
            shall have at least three compartments with two integral metal
            drainboards for manually washing, rinsing, and sanitizing EQUIPMENT
            and UTENSILs.

      (b) Sink compartments shall be large enough to accommodate immersion of
            the largest EQUIPMENT and UTENSILs. If EQUIPMENT or UTENSILs
            are not designed to be washed in a WAREWASHING sink, alternate
            APPROVED methods as specified in Section 114099.3 shall be followed.

      (c) A two compartment sink that is in use on January 1, 1996, need not be
            replaced when used as specified in Section 114099.3. The
            ENFORCEMENT OFFICER shall approve the continued use of a two-
            compartment sink even upon replacement if the installation of a three-
            compartment sink would not be readily achievable and where other
            APPROVED sanitation methods are used.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.1', 'Precleaning', '(a) During manual or mechanical WAREWASHING, FOOD debris on
            EQUIPMENT and UTENSILs shall be scrapped over a waste disposal
            unit, scupper, or garbage receptacle.

      (b) If necessary for effective cleaning, UTENSILs and EQUIPMENT shall be
            preflushed, presoaked, or scrubbed with abrasives.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.2', 'Manual warewashing procedures', '91
      (a) Notwithstanding Section 114099, manual WAREWASHING shall be
            accomplished by using a three-compartment sink.

      (b) The temperature of the washing solution shall be maintained at not less
            than 100�F or the temperature specified by the manufacturer on the
            cleaning agent manufacturer''s label instructions or as provided in writing
            by the manufacturer.

      (c) The UTENSILs shall then be rinsed in clear water before being immersed
            in a sanitizing solution.

      (d) Manual SANITIZATION shall be accomplished as specified in Section
            114099.6.

      (e) In-place sanitizing shall be accomplished as specified in Section
            114099.6.

      (f) Other methods may be used if APPROVED by the ENFORCEMENT
            AGENCY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.3', 'Washing, procedures for alternative manual warewashing', 'equipment

            Alternative manual WAREWASHING EQUIPMENT may be used when
there are special cleaning needs or constraints, such as when EQUIPMENT is
fixed or the UTENSILs are large, and the ENFORCEMENT AGENCY has
APPROVED the use of the alternative EQUIPMENT. Alternative manual
WAREWASHING EQUIPMENT may include any of the following:

      (a) High-pressure detergent sprayers.
      (b) Low-or-line pressure spray detergent foamers.
      (c) Other task-specific cleaning EQUIPMENT.
      (d) Brushes or other implements.
      (e)

                  (1) A two-compartment sink, if the PERMIT HOLDER limits the
                        number of UTENSILs cleaned and sanitized in the two-
                        compartment sink, limits WAREWASHING to batch operations
                        for cleaning and sanitizing UTENSILs, such as between cutting
                        one type of raw MEAT and another or cleanup at the end of a
                        shift, and does either of the following:
                        (A) Makes up the cleaning and sanitizing solutions immediately
                              before use and drains them immediately after use, as well
                              as uses a detergent sanitizer to clean and sanitize in
                              accordance with the manufacturer''s label instructions
                              where there is no distinct water rinse between the washing
                              and sanitizing steps. The agent applied in the sanitizing
                              step shall be the same detergent sanitizer that is used in
                              the washing step.
                        (B) Use a hot water SANITIZATION immersion step that
                              incorporates a nondistinct water rinse.

                   (2) A two-compartment sink shall not be used for WAREWASHING
                        operations where cleaning and sanitizing solutions are used for

                                               92
                        a continuous or intermittent flow of UTENSILs in an ongoing
                        WAREWASHING process.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.4', 'Manual warewashing, heat sanitization', 'If hot water is used for SANITIZATION in manual WAREWASHING
operations, the sanitizing compartment of the sink shall be designed with an
integral heating device that is capable of maintaining water at a temperature not
less than 171�F and provided with a rack or basket to allow complete immersion
of EQUIPMENT and UTENSILs into the hot water.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.5', 'Temperature measuring devices, manual warewashing', 'In manual WAREWASHING operations, a TEMPERATURE
MEASURING DEVICE shall be provided and readily accessible for frequently
measuring the washing and sanitizing temperatures.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.6', 'Manual sanitization', 'Manual SANITIZATION shall be accomplished in the final sanitizing rinse
by one of the following:

      (a) Immersion for at least 30 seconds where the water temperature is
            maintained at 171 degrees Fahrenheit or above.

      (b) The application of sanitizing chemicals by immersion, manual swabbing,
            or brushing, using one of the following solutions:
                  (1) Contact with a solution of 100 ppm available chlorine solution
                        for at least 30 seconds.
                  (2) Contact with a solution of 25 ppm available iodine for at least
                        one minute.
                  (3) Contact with a solution of 200 ppm quaternary ammonium for at
                        least one minute.
                  (4) Contact with a solution of ozone that meets the requirements of
                        Section 180.940 of Title 40 of the Code of Federal Regulations
                        and that is generated by a device located onsite at the FOOD
                        FACILITY that meets all of the following requirements:
                        (A) Complies with the Federal Insecticide, Fungicide, and
                              Rodenticide Act (7 U.S.C. Sec. 136 et seq.).
                        (B) Complies with federal device requirements as specified in
                              Section 152.500 of Title 40 of the Code of Federal
                              Regulations, and federal labeling requirements as specified
                              in Section 156.10 of Title 40 of the Code of Federal
                              Regulations.
                        (C) Displays the United States Environmental Protection Agency
                              device manufacturing facility registration number on the
                              device.
                        (D) Is operated and maintained in accordance with the
                              manufacturer''s instructions, and manufactured using good

                                               93
                              manufacturing practices as specified in Part 110 of Title 21
                              of the Code of Federal Regulations.
                  (5) Contact with any chemical sanitizer that meets the requirements
                        of Section 180.940 of Title 40 of the Code of Federal
                        Regulations when used in accordance with the manufacturer''s
                        use directions.
      (c) Other methods APPROVED by the ENFORCEMENT AGENCY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114099.7', 'Mechanical sanitization', 'Mechanical SANITIZATION shall be accomplished in the final sanitizing
rinse by one of the following:

      (a) By being cycled through EQUIPMENT that is used in accordance with the
            manufacturer''s specifications and achieving a UTENSIL SURFACE
            temperature of 160�F as measured by an irreversible registering
            temperature indicator.

      (b) The mechanical application of sanitizing chemicals by pressure spraying
            methods using one of the following solutions:
                  (1) Contact with a solution of 50 ppm available chlorine for at least
                        30 seconds.
                  (2) Contact with a solution of 25 ppm available iodine for at least
                        one minute.
                  (3) Contact with any chemical sanitizer that meets the requirements
                        of Section 180.940 of Title 40 of the Code of Federal
                        Regulations when used in accordance with the following:
                        (A) The sanitizer manufacturer''s use directions as specified on
                              the product label.
                        (B) The machine manufacturer''s specifications as provided in
                              the manufacturer''s operating instructions.

      (c) After being cleaned and sanitized, EQUIPMENT and UTENSILS shall not
            be rinsed before air drying or use unless:
                  (1) The rinse is applied directly from a POTABLE WATER supply by
                        a WAREWASHING machine that meets the requirements of
                        subdivision (b) of Section 114130 and is maintained and
                        operated in accordance with the manufacturer''s specifications.
                  (2) The rinse is applied only after the EQUIPMENT and UTENSILs
                        have been sanitized by the application of hot water or by the
                        application of a chemical sanitizer solution whose United States
                        Environmental Protection Agency-registered, label use
                        instructions require rinsing off the sanitizer after it is applied in
                        an approved commercial WAREWASHING machine.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114101', 'Mechanical machine warewashing procedures', '94
      (a) Mechanical machine WAREWASHING shall be accomplished by using
            an APPROVED machine installed and operated in accordance with the
            manufacturer''s specifications.

      (b) Soiled items to be cleaned in a WAREWASHING machine shall be loaded
            in racks, trays, or baskets or onto conveyors in a position that exposes
            the items to the unobstructed spray during all cycles and allows the items
            to drain.

      (c) The velocity, quantity, and distribution of the washwater, type, and
            concentration of detergent used therein, and the time the UTENSILs are
            exposed to the water shall be sufficient to clean the UTENSILs.

      (d) RESTRICTED FOOD SERVICE FACILITIES need not comply with
            Section 114130 if the domestic or commercial dishwasher utilized for
            WAREWASHING is capable of providing heat to the surface of the
            UTENSILs of a temperature of at least 160�F.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114101.1', 'Warewashing machine, data plate operating specifications', 'A WAREWASHING machine shall be provided with an easily accessible
and readable data plate affixed to the machine by the manufacturer that indicates
the machine''s design and operating specifications including the temperatures
required for washing, rinsing, and sanitizing, the pressure required for the fresh
water sanitizing rinse, unless the machine is designed to use only a pumped
sanitizing rinse, and the conveyor speed for conveyor machines or cycle time for
stationary rack machines.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114101.2', 'Warewashing machines, temperature measuring devices', 'A WAREWASHING machine shall be equipped with a TEMPERATURE
MEASURING DEVICE that indicates the temperature of the water as the water
enters the hot water sanitizing final rinse manifold or in the chemical sanitizing
solution tank.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114103', 'Drainboards', '(a) Except as provided in subdivisions (b) and (c), all WAREWASHING
            EQUIPMENT shall be provided with two integral metal drainboards of
            adequate size and construction. One drainboard shall be attached at the
            point of entry for soiled EQUIPMENT and UTENSILs and one shall be
            attached at the point of exit for cleaned and sanitized EQUIPMENT and
            UTENSILs.

      (b) Where a mechanical WAREWASHING machine is used, there shall be
            two metal drainboards, one for soiled EQUIPMENT and UTENSILs, and
            one for clean EQUIPMENT and UTENSILs, located adjacent to the
            machine. The requirement for a drainboard for soiled equipment and
            utensils or the requirement for a drainboard for clean equipment and
            UTENSILs, or both requirements, may be satisfied by using the
            drainboards that are part of the manual WAREWASHING sinks if the sink

                                               95
            is located adjacent to the machine.
      (c) Pot and pan washers shall be equipped with drainboards as required in

            subdivision (a), or shall be equipped with APPROVED alternative
            EQUIPMENT that provides adequate and suitable space for soiled and
            clean EQUIPMENT and UTENSILs.
      (d) Drainboards, UTENSIL racks, or tables large enough to accommodate all
            soiled and cleaned items that may accumulate during hours of operation
            shall be provided for necessary UTENSIL holding before cleaning and
            after sanitizing.
      (e) Sinks and drainboards of WAREWASHING EQUIPMENT shall be sloped
            and drained to an APPROVED liquid waste receptor.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114105', 'Equipment and utensils, air-drying required', 'After cleaning and sanitizing, EQUIPMENT and UTENSILs shall be air
dried or used after adequate draining before contact with FOOD and shall not be
cloth dried, except that UTENSILs that have been air dried may be polished with
cloths that are maintained clean and dry.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114107', 'Sanitizing solutions, testing devices', '(a) Testing EQUIPMENT and materials shall be provided to adequately
            measure the applicable SANITIZATION method used during manual or
            mechanical WAREWASHING.

      (b) The concentration of the sanitizing solution shall be accurately
            determined to ensure proper dosage.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114109', 'Drying agents, criteria', '(a) Drying agents used in conjunction with SANITIZATION shall contain only
            components that are listed as one of the following:
                  (1) Generally Recognized as Safe for use in FOOD as specified in
                        21 C.F.R. 182 - Substances Generally Recognized as Safe, or
                        21 C.F.R. 184 - Direct Food Substances Affirmed as Generally
                        Recognized as Safe.
                  (2) Generally Recognized as Safe for the intended use as specified
                        in 21 C.F.R. 186 - Indirect Food Substances Affirmed as
                        Generally Recognized as Safe.
                  (3) APPROVED for use as a drying agent under a prior sanction
                        specified in 21 C.F.R. 181 - Prior-Sanctioned FOOD Ingredients.
                  (4) Specifically regulated as an indirect FOOD ADDITIVE for use as
                        a drying agent as specified in 21 C.F.R. 175 -178, inclusive.
                  (5) APPROVED for use as a drying agent under the threshold of
                        regulation process established by 21 C.F.R. 170.39.

      (b) When SANITIZATION is with chemicals, the approval required under
            paragraph (3) or (5) of subdivision (a) or the regulation as an indirect
            FOOD ADDITIVE required under paragraph (4) of subdivision (a), shall

                                               96
            be specifically for use with chemical sanitizing solutions.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114111', 'Dry cleaning methods', '(a) If used, dry cleaning methods such as brushing, scraping, and vacuuming
            shall contact only surfaces that are soiled with dry nonPOTENTIALLY
            HAZARDOUS FOOD residues.

      (b) Cleaning EQUIPMENT used in dry cleaning FOOD-CONTACT
            SURFACEs shall not be used for any other purpose.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114113', 'Food contact with equipment and utensils', 'FOOD shall only contact surfaces of EQUIPMENT and UTENSILs that
are cleaned and sanitized.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114115', 'Equipment, food-contact surfaces, nonfood-contact surfaces', 'and utensils

            EQUIPMENT FOOD-CONTACT SURFACEs and UTENSILs shall be
clean to sight and touch.

      (a) The FOOD-CONTACT SURFACEs of cooking EQUIPMENT and pans
            shall be kept free of encrusted grease deposits and other soil
            accumulations.

      (b) NonFOOD-CONTACT SURFACEs of EQUIPMENT shall be kept free of
            an accumulation of dust, dirt, FOOD residue, and other debris.

      (c) EQUIPMENT shall be reassembled so that FOOD-CONTACT
            SURFACEs are not contaminated.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114117', 'Cleaning frequency of equipment food-contact surfaces and', 'utensils

      (a) EQUIPMENT FOOD-CONTACT SURFACEs and UTENSILs shall be
            cleaned and sanitized at the following times:
                  (1) Except as specified in subdivision (b), before each use with a
                        different type of raw FOOD of animal origin such as beef, FISH,
                        lamb, pork, or POULTRY.
                  (2) Each time there is a change from working with raw FOODs to
                        working with READY-TO-EAT FOODs.
                  (3) Between uses with raw PRODUCE and with POTENTIALLY
                        HAZARDOUS FOOD.
                  (4) Before using or storing a FOOD TEMPERATURE MEASURING
                        DEVICE.
                  (5) At any time during the operation when contamination may have
                        occurred.

                                               97
(b) Paragraph (1) of subdivision (a) does not apply if the FOOD contact
      surface or UTENSIL is in contact with a succession of different raw
      FOODs of animal origin, each requiring a higher cooking temperature as
      specified in Section 114004 than the previous FOOD, such as preparing
      raw FISH followed by cutting raw POULTRY on the same cutting board.

(c) Except as specified in subdivision (d), if used with POTENTIALLY
      HAZARDOUS FOOD, EQUIPMENT FOOD-CONTACT SURFACEs and
      UTENSILs shall be cleaned and sanitized throughout the day at least
      every four hours.

(d) Surfaces of UTENSILs and EQUIPMENT contacting POTENTIALLY
      HAZARDOUS FOOD may be cleaned and sanitized less frequently than
      every four hours if any of the following occurs:
            (1) In storage, containers of POTENTIALLY HAZARDOUS FOOD
                  and their contents are maintained at temperatures as specified
                  in Section 113996 and the containers are cleaned and sanitized
                  when they are empty.
            (2) UTENSILs and EQUIPMENT are used to prepare FOOD in a
                  refrigerated room or area that is maintained at or below 55�F. In
                  that case, the UTENSILs and EQUIPMENT shall be cleaned
                  and sanitized at the frequency that corresponds to the
                  temperature as depicted in the following chart and the cleaning
                  frequency based on the ambient temperature of the refrigerated
                  room or area shall be documented and records shall be
                  maintained in the FOOD FACILITY and made available to the
                  ENFORCEMENT AGENCY upon request:

Temperature           Cleaning Frequency
5.0�C (41�F) or less  24 hours
                      20 hours
>5.0�C � 7.2�C
(>41�F - 45�F)        16 hours
>7.2�C � 10.0�C
(>45�F - 50�F)        10 hours
>10.0�C � 12.8�C
(>50�F - 55�F)

(3) Containers in serving situations such as salad bars, delis, and
      cafeteria lines hold READY-TO-EAT POTENTIALLY
      HAZARDOUS FOOD that is maintained at the temperatures
      specified in subdivisions (a) to (c), inclusive, of Section 113996
      are intermittently combined with additional supplies of the same
      FOOD that is at the required temperature, and the containers
      are cleaned and sanitized at least every 24 hours. UTENSILs
      and containers holding POTENTIALLY HAZARDOUS FOODs
      in accordance with subdivision (d) of Section 113996 are
      cleaned when they are empty or when the remaining contents

                               98
                  are disposed of.
            (4) TEMPERATURE MEASURING DEVICEs are maintained in

                  contact with FOOD, such as when left in a container of deli
                  FOOD or in a roast, held at temperatures specified in Sections
                  113996 and 114004.
            (5) EQUIPMENT is used for storage of packaged or unpackaged
                  FOOD, such as a reach-in refrigerator, and the EQUIPMENT is
                  cleaned and sanitized at a frequency necessary to preclude
                  accumulation of soil residues.
            (6) The cleaning schedule is APPROVED based on consideration
                  of characteristics of the EQUIPMENT and its use, the type of
                  FOOD involved, the amount of FOOD residue accumulation,
                  and the temperature at which the FOOD is maintained during
                  the operation and the potential for the rapid and progressive
                  multiplication of pathogenic or toxigenic micro-organisms that
                  are capable of causing foodborne disease.
            (7) In-use UTENSILs are intermittently stored in a container of water
                  in which the water is maintained at 135�F or higher and the
                  UTENSILs and container are cleaned and sanitized at least
                  every 24 hours or at a frequency necessary to preclude
                  accumulation of soil residues.
(e) Except when dry cleaning methods are used as specified in Section
      114111, surfaces of UTENSILs and EQUIPMENT contacting FOOD that
      is not POTENTIALLY HAZARDOUS shall be cleaned and sanitized in any
      of the following circumstances:
            (1) At any time when contamination may have occurred.
            (2) At least every 24 hours for iced tea dispensers and
                  CONSUMER self-service UTENSILs such as tongs, scoops, or
                  ladles.
            (3) Before restocking CONSUMER self-service EQUIPMENT and
                  UTENSILs such as CONDIMENT dispensers and display
                  containers.
            (4) In EQUIPMENT such as ice bins and BEVERAGE dispensing
                  nozzles and enclosed components of EQUIPMENT such as ice
                  makers, cooking oil storage tanks and distribution lines,
                  BEVERAGE and syrup dispensing lines or tubes, coffee bean
                  grinders, and water vending EQUIPMENT, at a frequency
                  specified by the manufacturer, or, absent manufacturer
                  specifications, at a frequency necessary to preclude
                  accumulation of soil or mold.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114118', 'Fabric implements', 'FABRIC IMPLEMENTs shall be laundered and sanitized before or after
use in direct contact with FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114119', 'In-use utensils, between-use storage', '99
            During pauses in FOOD PREPARATION or dispensing, FOOD
PREPARATION and dispensing UTENSILs shall be stored in the following
manner:

      (a) Except as specified under subdivision (b), in the FOOD with their handles
            above the top of the FOOD and the container.

      (b) In FOOD that is not POTENTIALLY HAZARDOUS, with their handles
            above the top of the FOOD within containers or EQUIPMENT that can be
            closed, such as bins of sugar, flour, or cinnamon.

      (c) On a clean portion of the FOOD PREPARATION table or cooking
            EQUIPMENT only if the in-use UTENSIL and the FOOD-CONTACT
            SURFACE of the FOOD PREPARATION table or cooking EQUIPMENT
            are cleaned and sanitized at a frequency specified under Section 114117.

      (d) In running water of sufficient velocity to flush particulates to the drain, if
            used with moist FOOD such as ice cream or mashed potatoes.

      (e) In a clean, protected location if the UTENSILs, such as ice scoops, are
            used only with a FOOD that is not POTENTIALLY HAZARDOUS.

      (f) In a container of water if the water is maintained at a temperature of at
            least 135�F and the container is cleaned at least every 24 hours or at a
            frequency necessary to preclude the accumulation of soil residues.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114121', 'Returnables, cleaning for refilling', '(a) Except as specified in subdivisions (b), (c) and (d), returned empty
            containers intended for filling with FOOD or BEVERAGE shall be cleaned
            and filled in an APPROVED facility.

      (b)
            (1) Clean CONSUMER-owned containers provided or returned to the
                  FOOD FACILITY for filling may be filled and returned to the same
                  CONSUMER if the container is filled by either an EMPLOYEE of the
                  FOOD FACILITY or the owner of the container. For the purposes of
                  this section, a CONSUMER-owned container shall be designed and
                  constructed for reuse in accordance with Section 3-304.17(B)(1) of
                  the 2017 Food Code published by the federal Food and Drug
                  Administration.
            (2) The FOOD FACILITY shall either isolate the CONSUMER-owned
                  containers from the serving surface or sanitize the serving surface
                  after each filling.

      (c) The FOOD FACILITY shall prepare, maintain, and adhere to written
            procedures to prevent cross-contamination, as described in Section
            113986, and the written procedures shall address waste water disposal.
            The FOOD FACILITY shall make the written procedures available to the
            ENFORCEMENT AGENCY upon request or at the time of an inspection.

      (d) CONSUMER-owned containers that are not FOOD specific may be filled
            at a water VENDING MACHINE or system.

      (e) The FOOD FACILITY shall ensure compliance with the handwashing
            requirements specified in Article 4 (commencing with Section 113952) of

                                               100
            Chapter 3.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114123', 'Cleaning maintenance tools, preventing contamination', 'Except as specified in Section 114125, FOOD PREPARATION sinks,
handwashing lavatories, and WAREWASHING EQUIPMENT shall not be used for
the cleaning of maintenance tools, the preparation or holding of maintenance
materials, or the disposal of mop water and similar liquid wastes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114125', 'Warewashing sinks, use limitation', '(a) A WAREWASHING sink shall not be used for handwashing except in
            FOOD FACILITIES that were not constructed or extensively
            REMODELed since January 1, 1996, and where there are no facilities
            exclusively for handwashing in FOOD PREPARATION areas.

      (b) If a WAREWASHING sink is used to wash wiping cloths, wash
            PRODUCE, or thaw FOOD, the sink shall be cleaned and sanitized
            before and after each time it is used to wash wiping cloths or wash
            PRODUCE or thaw FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "5", "chapter_title": "Cleaning and Sanitizing of Equipment"}'::jsonb),
  ('CalCode', '114130', 'Equipment and utensils', '(a) EQUIPMENT and UTENSILs shall be designed and constructed to be
            durable and to retain their characteristic qualities under normal use
            conditions.

      (b) Except as specified in subdivision (c), all new and replacement FOOD-
            related and UTENSIL-related EQUIPMENT shall be certified or classified
            for sanitation by an American National Standards Institute (ANSI)
            accredited certification program. In the absence of an applicable ANSI
            certified sanitation standard, FOOD-related and UTENSIL-related
            EQUIPMENT shall be evaluated for approval by the ENFORCEMENT
            AGENCY.

      (c) RESTRICTED FOOD SERVICE FACILITIES need not comply with
            subdivision (b), depending on the extent of the FOOD service activities,
            and if the ENFORCEMENT OFFICER determines that the EQUIPMENT
            meets the characteristics of subdivision (a).

      (d) All new and replacement electrical appliances shall meet applicable
            Underwriters Laboratories standards for electrical EQUIPMENT as
                                               101
            determined by an ANSI accredited certification program.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.1', 'Characteristics', 'Materials that are used in the construction of UTENSILs and FOOD-
CONTACT SURFACEs of EQUIPMENT shall not allow the migration of deleterious
substances or impart colors, odors, or tastes to FOOD and under normal use
conditions shall be safe, durable, corrosion-resistant, and nonabsorbent, sufficient
in weight and thickness to withstand repeated WAREWASHING, finished to have
a SMOOTH, EASILY CLEANABLE surface, and resistant to pitting, chipping,
crazing, scratching, scoring, distortion, and decomposition.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.2', 'Single-use characteristics', 'Materials that are used to make SINGLE-USE ARTICLES shall not allow
the migration of deleterious substances or impart colors, odors, or tastes to FOOD,
and shall be safe and clean.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.3', 'Food-contact surfaces', '(a) Multiuse FOOD-CONTACT SURFACEs shall be all of the following:
                  (1) SMOOTH.
                  (2) Free of breaks, open seams, cracks, chips, inclusions, pits, and
                        similar imperfections.
                  (3) Free of sharp internal angles, corners, and crevices.
                  (4) Finished to have SMOOTH welds and joints.
                  (5) Except as specified in subdivision (b), accessible for cleaning
                        and inspection by one of the following methods:
                        (A) Without being disassembled.
                        (B) By disassembling without the use of tools.
                        (C) By easy disassembling with the use of handheld tools
                              commonly available to maintenance and cleaning
                              personnel such as screwdrivers, pliers, open-end
                              wrenches, and Allen wrenches.

      (b) Paragraph (5) of subdivision (a) shall not apply to cooking oil storage
            tanks, distribution lines for cooking oils, or BEVERAGE syrup lines or
            tubes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.4', 'Nonfood-contact surfaces', 'NonFOOD-CONTACT SURFACEs of EQUIPMENT that are exposed to
splash, spillage, or other FOOD soiling or that require frequent cleaning shall be
constructed of a corrosion-resistant, nonabsorbent, and SMOOTH material that
allows easy cleaning and to facilitate maintenance and free of unnecessary ledges,
projections, and crevices to allow for easy cleaning and to facilitate maintenance.

                                               102', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.5', 'CIP equipment', '(a) Except for CIP EQUIPMENT in operation before the effective date of this
            part, CIP EQUIPMENT shall meet the characteristics of a FOOD
            CONTACT SURFACE and shall be designed and constructed so that
            cleaning and sanitizing solutions circulate throughout a fixed system and
            contact all interior FOOD-CONTACT SURFACEs and the system is self-
            draining or capable of being completely drained of cleaning and sanitizing
            solutions.

      (b) CIP EQUIPMENT that is not designed to be disassembled for cleaning
            shall be designed with inspection access points to ensure that all interior
            FOOD-CONTACT SURFACEs throughout the fixed system are being
            effectively cleaned.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114130.6', 'Materials used in fabric implements', 'Materials that are used in FABRIC IMPLEMENTs shall not allow the
migration of deleterious substances or impart colors, odors, or tastes to FOOD and
under normal use conditions shall be safe, durable, and sufficient in strength to
withstand repeated cleaning or laundering and shall be resistant to fraying and
deterioration.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114132', 'Wood, use limitation', '(a) Except as specified in this section, wood and wood wicker shall not be
            used as a FOOD-CONTACT SURFACE.

      (b) Hard maple or an equivalently hard, close-grained wood may be used for
            cutting boards, cutting blocks, bakers'' tables, UTENSILs such as rolling
            pins, doughnut dowels, salad bowls, and chopsticks, wooden paddles
            used in confectionery operations for pressure scraping kettles when
            manually preparing confections at a temperature of 230�F or above, and
            cedar planks used for grilling or baking seafood.

      (c) Whole, uncut, raw fruits and vegetables and nuts in the shell may be kept
            in wood shipping containers until the fruits, vegetables, or nuts are used.

      (d) When wood or wood shipping containers become cracked, splintered, or
            otherwise damaged, they shall be refurbished or replaced.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114133', 'Copper, use limitation', '(a) Except as specified in subdivision (b), copper and copper alloys such as
            brass may not be used in contact with a FOOD that has a pH below six,
            such as vinegar, fruit JUICE, or wine, or for a fitting or tubing installed
            between a backflow prevention device and a carbonator.

      (b) Copper and copper alloys may be used in contact with beer brewing
            ingredients that have a pH below six in the prefermentation and
            fermentation steps of a beer brewing operation, such as a brewpub or

                                               103
            microbrewery.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114135', 'Sponges, use limitation', 'Sponges shall not be used in contact with cleaned and sanitized or in-use
FOOD-CONTACT SURFACEs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114137', '"V" threads, use limitation', 'Except for hot oil cooking or filtering EQUIPMENT, "V" type threads shall
not be used on FOOD-CONTACT SURFACEs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114139', 'Can openers', 'Cutting or piercing parts of can openers shall be readily removable for
cleaning and for replacement.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114141', 'Lubrication of food-contact surfaces', 'Lubricants shall be applied to FOOD-CONTACT SURFACEs that require
lubrication in a manner that does not contaminate FOOD or FOOD-CONTACT
SURFACEs. EQUIPMENT shall be reassembled after lubrication so that FOOD
contact surfaces are not contaminated. Only APPROVED FOOD grade lubricants
shall be used for this purpose.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114143', 'Open-air barbecue/outdoor wood-burning oven', 'Notwithstanding any of the provisions of this part, neither the
DEPARTMENT nor any city, county, city and county air pollution control district, or
air quality management district shall require the enclosure of an OPEN-AIR
BARBECUE or OUTDOOR WOOD-BURNING OVEN if the ENFORCEMENT
OFFICER determines that the barbecue or wood-burning oven meets all of the
following requirements:

      (a) The OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING OVEN is
            operated on the same PREMISES as, in reasonable proximity to, and in
            conjunction with, a PERMANENT FOOD FACILITY that is APPROVED
            for FOOD PREPARATION, a TEMPORARY FOOD FACILITY or a
            MOBILE FOOD FACILITY that is operating at a COMMUNITY EVENT or
            a CATERING OPERATION. The PERMIT HOLDER of the PERMANENT
            FOOD FACILITY, TEMPORARY FOOD FACILITY, MOBILE FOOD
            FACILITY, or CATERING OPERATION shall be deemed to be the
            PERMIT HOLDER of the OPEN-AIR BARBECUE or OUTDOOR WOOD-
            BURNING OVEN, and shall be responsible for ensuring that it is operated
            in full compliance with this part.

      (b) The OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING OVEN is
                                               104
            not operated in, or out of, any motor vehicle, or in any area or location
            that may constitute a fire HAZARD, as determined by the
            ENFORCEMENT OFFICER.
      (c) The OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING OVEN is
            separated from public access to prevent FOOD contamination or injury to
            the public by using ropes or other APPROVED methods.
      (d) If the OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING OVEN is
            a permanent structure, it shall be equipped with an impervious and
            EASILY CLEANABLE floor surface that extends a minimum of five feet
            from the OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING
            OVEN facility on all open sides.
      (e) Sanitary facilities, including, but not limited to, toilet facilities and
            handwashing facilities shall be available for use within 200 feet in travel
            distance of the OPEN-AIR BARBECUE or OUTDOOR WOOD-BURNING
            OVEN and shall comply with all provisions of this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114145', 'Vending machines', 'VENDING MACHINES shall meet all applicable requirements of this part
and shall comply with the following:

      (a) Each VENDING MACHINES or machine location shall have posted in a
            prominent place a sign indicating the owner''s name, address, and
            telephone number.

      (b) Wet storage of prepackaged products is prohibited.
      (c) POTENTIALLY HAZARDOUS FOOD shall be dispensed to the

            CONSUMER in the original package into which it was placed at the
            COMMISSARY or FOOD processing plant. Bulk POTENTIALLY
            HAZARDOUS FOOD is prohibited.
      (d) SINGLE-USE ARTICLES that are used in machines dispensing products
            in bulk shall be obtained in sanitary packages. The SINGLE-USE
            ARTICLES shall be stored in the original package until introduced into the
            container magazine or dispenser of the VENDING MACHINES.
      (e) A record of cleaning and sanitizing shall be maintained by the operator in
            each machine and shall be current for at least the past 30 days.
      (f) All VENDING MACHINES shall be constructed in accordance with
            applicable NSF International or National Automatic Merchandizing
            Association standards, or the equivalent thereof.
      (g) If located outside, a VENDING MACHINE shall be provided with
            overhead protection.
      (h) The dispensing compartment of a VENDING MACHINES shall be
            equipped with a self-closing door or cover if the machine is located in an
            outside area that does not otherwise afford the protection of an enclosure
            against the rain, windblown debris, insects, rodents, and other
            contaminants that are present in the environment, or if the machine is
            available for self-service during hours when it is not under the full-time
            supervision of an EMPLOYEE.

                                               105', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "1", "article_title": "Design and Construction"}'::jsonb),
  ('CalCode', '114149', 'Ventilation systems', '(a) All areas of a FOOD FACILITY shall have sufficient ventilation to facilitate
            proper FOOD storage and to provide a reasonable condition of comfort
            for each EMPLOYEE, consistent with the job performed by the
            EMPLOYEE.

      (b) Toilet rooms shall be vented to the outside air by means of an openable,
            screened window, an air shaft, or a light-switch-activated exhaust fan,
            consistent with the requirements of local building codes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "2", "article_title": "Ventilation"}'::jsonb),
  ('CalCode', '114149.1', 'Mechanical exhaust ventilation', '(a) Mechanical exhaust ventilation EQUIPMENT shall be provided over all
            cooking EQUIPMENT as required to effectively remove cooking odors,
            smoke, steam, grease, heat, and vapors. All mechanical exhaust
            ventilation EQUIPMENT shall be installed and maintained in accordance
            with the California Mechanical Code, except that for units subject to Part
            2 (commencing with Section 18000) of Division 13, an alternative code
            adopted pursuant to Section 18028 shall govern the construction
            standards.

      (b) RESTRICTED FOOD SERVICE FACILITIES shall be exempt from
            subdivision (a), but shall still provide ventilation to remove gases, odors,
            steam, heat, grease, vapors and smoke from the FOOD FACILITY. In the
            event that the ENFORCEMENT OFFICER determines that the ventilation
            must be mechanical in nature, the ventilation shall be accomplished by
            methods APPROVED by the ENFORCEMENT AGENCY.

      (c) This section shall not apply to cooking EQUIPMENT when the
            EQUIPMENT has been submitted to the local ENFORCEMENT
            AGENCY for evaluation, and the local ENFORCEMENT AGENCY has
            found that the EQUIPMENT does not produce toxic gases, smoke,
            grease, vapors, or heat when operated under conditions recommended
            by the manufacturer. The local ENFORCEMENT AGENCY may
            recognize a testing organization to perform any necessary evaluations.

      (d) Makeup air shall be provided at the rate of that exhausted.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "2", "article_title": "Ventilation"}'::jsonb),
  ('CalCode', '114149.2', 'Ventilation hood system', '(a) Every hood shall be installed to provide for thorough cleaning of all interior
            and exterior surfaces, including, but not limited to, the hood, filters, piping,
            lights, troughs, hangers, flanges, and exhaust ducts.

      (b) Exhaust ventilation hood systems in FOOD PREPARATION and
            WAREWASHING areas, including components such as hoods, fans,

                                               106
            guards, and ducting, shall be designed to prevent grease or condensation
            from draining or dripping onto FOOD, EQUIPMENT, UTENSILs, LINENS,
            and SINGLE-USE ARTICLES.
      (c) Filters or other grease extracting EQUIPMENT shall be designed to be
            readily removable for cleaning and replacement if not designed to be
            cleaned in place.
      (d) Every joint and seam shall be substantially tight. No solder shall be used,
            except for sealing a joint or seam.
      (e) When grease gutters are provided they shall drain to a collecting
            receptacle fabricated, designed, and installed to be readily accessible for
            cleaning.
      (f) Exhaust hood ducting shall meet the following requirements:

                  (1) All seams in the duct shall be completely tight to prevent the
                        accumulation of grease.

                  (2) The ducts shall have sufficient clean-outs to make the ducts
                        readily accessible for cleaning.

                  (3) All ducts in the exhaust system shall be properly sloped.
                  (4) Intake and exhaust air ducts shall be cleaned and filters

                        changed so they are not a source of contamination by dust, dirt,
                        and other materials.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "2", "article_title": "Ventilation"}'::jsonb),
  ('CalCode', '114149.3', 'Heating, ventilating, air conditioning system vents', 'Heating, ventilating, and air conditioning systems shall be designed and
installed so that make-up air intake and exhaust vents do not cause contamination
of FOOD, FOOD-CONTACT SURFACEs, EQUIPMENT, or UTENSILs and do not
create air currents that cause difficulty in maintaining the required temperatures of
POTENTIALLY HAZARDOUS FOODs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "2", "article_title": "Ventilation"}'::jsonb),
  ('CalCode', '114153', 'Cooling, heating, and holding capacities', 'EQUIPMENT for cooling and heating FOOD and for holding cold and hot
FOOD shall be sufficient in number and capacity to ensure proper FOOD
temperature control during transportation and operation as specified in Section
113996.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114157', 'Temperature measuring devices', '(a) A thermometer shall be provided for each REFRIGERATION UNIT.
      (b) The thermometer shall be located to indicate the air temperature in the

            warmest part of the unit and, except for VENDING MACHINES, shall be
            affixed to be readily visible.
      (c) Except as specified in subdivision (d), cold or hot holding EQUIPMENT
            used for POTENTIALLY HAZARDOUS FOOD shall be designed to

                                               107
            include and shall be equipped with at least one integral or permanently
            affixed TEMPERATURE MEASURING DEVICE that is located to allow
            easy viewing of the device''s temperature display. Alternative hot or cold
            holding EQUIPMENT can be equipped with APPROVED product
            mimicking sensors placed in devices located in the warmest part of the
            mechanically refrigerated unit in lieu of an ambient air sensor.
      (d) Subdivision (c) shall not apply to EQUIPMENT for which the placement
            of a TEMPERATURE MEASURING DEVICE is not a practical means for
            measuring the ambient air surrounding the FOOD because of the design,
            type, and use of the EQUIPMENT, such as calrod units, heat lamps, cold
            plates, bainmaries, steam tables, insulated FOOD transport containers,
            and salad bars.
      (e) TEMPERATURE MEASURING DEVICEs shall be easily readable and
            have a numerical scale, printed record, or digital readout in increments
            no greater than 2�F or over the intended range of use.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114159', 'Food temperature measuring devices', '(a) Except for VENDING MACHINES, an accurate, easily readable, metal
            probe thermometer suitable for measuring the temperature of FOOD shall
            be readily available on the PREMISES of each FOOD FACILITY holding
            POTENTIALLY HAZARDOUS FOOD.

      (b) A FOOD TEMPERATURE MEASURING DEVICE with a suitable small-
            diameter probe that is designed to measure the temperature of thin
            masses shall be provided and readily accessible to accurately measure
            the temperature in thin FOODs such as MEAT patties and FISH fillets.

      (c) FOOD TEMPERATURE MEASURING DEVICEs that are scaled only in
            Fahrenheit shall be accurate to +/-2�F in the intended range of use.
            FOOD TEMPERATURE MEASURING DEVICEs that are scaled only in
            Celsius or dually scaled in Celsius and Fahrenheit shall be accurate to
            +/-1�C in the intended range of use.

      (d) FOOD TEMPERATURE MEASURING DEVICEs shall not have sensors
            or stems constructed of glass, except that thermometers with glass
            sensors or stems that are encased in a shatterproof coating, such as
            candy thermometers, may be used.

      (e) FOOD TEMPERATURE MEASURING DEVICEs shall be calibrated in
            accordance with manufacturer''s specifications as necessary to ensure
            their accuracy.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114161', 'Equipment, clothes washers and dryers, and storage cabinets,', 'contamination prevention

      (a) Except as specified in subdivision (b), EQUIPMENT, a cabinet used for
            the storage of FOOD, or a cabinet that is used to store cleaned and
            sanitized EQUIPMENT, UTENSILs, laundered LINENS, and SINGLE-
            USE ARTICLES shall not be in any of the following locations:
                  (1) In locker rooms.

                                               108
                  (2) In toilet rooms.
                  (3) In REFUSE rooms.
                  (4) In mechanical rooms.
                  (5) Under sewer lines that are not shielded to intercept potential

                        drips.
                  (6) Under leaking water lines, including leaking automatic fire

                        sprinkler heads, or under lines on which water has condensed.
                  (7) Under open stairwells.
                  (8) Under other sources of contamination.
      (b) If a mechanical clothes washer or dryer is provided, it shall be located so
            that the washer or dryer is protected from contamination and located only
            where there is no exposed FOOD, clean EQUIPMENT, UTENSILs, and
            LINENS, and unwrapped SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114163', 'Food preparation sinks', '(a) Except as specified in subdivision (b), all PERMANENT FOOD
            FACILITIES that wash, rinse, soak, thaw, or similarly prepare FOODs
            shall be provided with a FOOD PREPARATION sink.
                  (1) The FOOD PREPARATION sink shall have a minimum
                        dimension of 18 inches by 18 inches in length and width and 12
                        inches in depth with an integral drainboard or adjacent table at
                        least 18 inches by 18 inches in length and width.
                  (2) The FOOD PREPARATION sink shall be located in the FOOD
                        PREPARATION area, provided exclusively for FOOD
                        PREPARATION, and accessible at all times.
                  (3) The sink shall be equipped with an adequate supply of hot and
                        cold running water through a mixing valve.

      (b)
                  (1) FOOD FACILITIES that were APPROVED for operation without
                        a FOOD PREPARATION sink prior to January 1, 2007, need not
                        provide a FOOD PREPARATION sink unless the FOOD
                        FACILITY makes a MENU CHANGE or changes their method of
                        operation.
                  (2) The ENFORCEMENT OFFICER may approve other methods
                        where the installation of a FOOD PREPARATION sink would not
                        be readily feasible.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114165', 'Case lot handling equipment, moveability', 'Dollies, pallets, racks, and skids used to store and transport large
quantities of PREPACKAGED FOODs received from a supplier in a cased or
overwrapped lot shall be designed to be moved by hand or by conveniently
available hand trucks or forklifts.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114167', 'Beverage tubing, separation', '109
            BEVERAGE tubing and cold-plate BEVERAGE cooling devices shall not
be installed in contact with stored ice intended to be used for FOOD or
BEVERAGEs. This section shall not apply to cold plates that are constructed
integrally with an ice storage bin.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114169', 'Fixed equipment, spacing or sealing', '(a) EQUIPMENT that is fixed because it is not EASILY MOVABLE shall be
            installed so that it is:
                  (1) Spaced to allow access for cleaning along the sides, behind, and
                        above the EQUIPMENT.
                  (2) Spaced from adjoining EQUIPMENT, walls, and ceilings a
                        distance of not more than one millimeter or one thirty-second
                        inch.
                  (3) SEALED to adjoining EQUIPMENT or walls, if the EQUIPMENT
                        is exposed to spillage or seepage.

      (b) Except as specified in subdivisions (c) and (d), floor-mounted
            EQUIPMENT that is not EASILY MOVABLE shall be SEALED to the floor
            or elevated on legs that provide at least a six-inch clearance between the
            floor and the EQUIPMENT.

      (c) Notwithstanding subdivision (b), this section shall not apply to display
            shelving units, display REFRIGERATION UNITs, and display freezer
            units located in the CONSUMER shopping areas of a FOOD FACILITY if
            the floor under the units is maintained clean.

      (d) TABLE-MOUNTED EQUIPMENT that is not EASILY MOVABLE shall be
            installed to allow cleaning of the EQUIPMENT and areas underneath and
            around the EQUIPMENT by being SEALED to the table or elevated on
            legs that provide at least a four-inch clearance between the table and the
            EQUIPMENT.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114171', 'Ice units, separation of drains', 'Liquid waste drain lines shall not pass through an ice machine or ice
storage bin.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114172', 'Pressurized cylinders', 'All pressurized cylinders shall be securely fastened to a rigid structure.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "3", "article_title": "Location and Installation"}'::jsonb),
  ('CalCode', '114175', 'Good repair', 'EQUIPMENT and UTENSILs shall be kept clean, fully operative, and in
good repair.

                                               110', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114177', 'Cutting surfaces', 'Surfaces such as cutting blocks and boards that are subject to scratching
and scoring shall be resurfaced if they can no longer be effectively cleaned and
sanitized, or discarded if they are not capable of being resurfaced.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114178', 'Storing equipment, utensils, linens, and single-use articles', '(a) Except as specified in subdivision (d), cleaned EQUIPMENT and
            UTENSILs, laundered LINENS, and SINGLE-USE ARTICLES shall be
            stored in a clean, dry location where they are not exposed to splash, dust,
            or other contamination, and at least six inches above the floor.

      (b) Clean EQUIPMENT and UTENSILs shall be stored as specified in
            subdivision (a) and shall be stored covered or inverted in a self-draining
            position that allows air drying.

      (c) SINGLE-USE ARTICLES shall be stored as specified under subdivision
            (a) and shall be kept in the original protective package or stored by using
            other means that afford protection from contamination until used.

      (d) Items that are kept in closed packages may be stored less than six inches
            above the floor on dollies, pallets, racks, and skids that are designed as
            to be EASILY MOVABLE.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114179', 'Storage prohibitions', '(a) Except as specified in subdivision (b), cleaned and sanitized
            EQUIPMENT, UTENSILs, laundered LINENS, and SINGLE-USE
            ARTICLES shall not be stored in any of the following locations:
                  (1) In locker rooms.
                  (2) In toilet rooms.
                  (3) In REFUSE rooms.
                  (4) In mechanical rooms.
                  (5) Under sewer lines that are not shielded to intercept potential
                        drips.
                  (6) Under leaking water lines including leaking automatic fire
                        sprinkler heads or under lines on which water has condensed.
                  (7) Under open stairwells.
                  (8) Under other sources of contamination.
            (c) Laundered LINENS and SINGLE-USE ARTICLES that are packaged
            or in a storage compartment may be stored in a locker room.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114180', 'Water reservoir of fogging devices, cleaning', '(a) A reservoir that is used to supply water to a device such as a PRODUCE
            fogger shall be maintained in accordance with manufacturer''s
            specifications and cleaned in accordance with manufacturer''s

                                               111
            specifications or according to the procedures specified in subdivision (b),
            whichever is more stringent.
      (b) Cleaning procedures shall include at least the following steps and shall
            be conducted at least once a week:

                  (1) Draining and complete disassembly of the water and aerosol
                        contact parts.

                  (2) Brush-cleaning the reservoir, aerosol tubing, and discharge
                        nozzles with a suitable detergent solution.

                  (3) Flushing the complete system with water to remove the
                        detergent solution and particulate accumulation.

                  (4) Rinsing by immersing, spraying, or swabbing the reservoir,
                        aerosol tubing, and discharge nozzles with an APPROVED
                        sanitizer as specified in Section 114099.6.

      (c) No fogging devices installed after the effective date of this part shall use
            a reservoir for holding water for fogging, but shall employ water under
            pressure for fogging or misting of FOODs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114182', 'Electrical power requirements', 'Electrical power shall be supplied at all times to operate the APPROVED
exhaust, lighting, electric water heaters and REFRIGERATION UNITs, and any
other accessories and appliances that may be installed in a FOOD FACILITY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "4", "article_title": "Maintenance and Operation"}'::jsonb),
  ('CalCode', '114185', 'Linen, use limitation', 'Except for LINEN used in FABRIC IMPLEMENTs, LINEN shall not be
used in contact with FOOD unless they are used to line a container for the service
of FOODs and the LINENS are replaced each time the container is refilled for a
new CONSUMER and laundered prior to reuse.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114185.1', 'Wiping cloths, use limitation', '(a) Wiping cloths that are in use for cleaning FOOD spills shall not be used
            for any other purpose.

      (b) Cloths used for wiping FOOD spills shall be dry and used for cleaning
            FOOD spills from TABLEWARE and carry-out containers or used only
            once, or if used repeatedly, held in a sanitizing solution of an APPROVED
            concentration as specified in Section 114099.6.

      (c) Dry or wet cloths that are used with raw FOODs of animal origin shall be
            kept separate from cloths used for other purposes, and wet cloths used
            with raw FOODs of animal origin shall be kept in a separate sanitizing
            solution.

      (d) Wet wiping cloths used with a freshly made sanitizing solution and dry
            wiping cloths shall be free of FOOD debris and visible soil.

                                               112
      (e) Working containers of sanitizing solutions for storage of in-use wiping
            cloths shall be used in a manner to prevent contamination of FOOD,
            EQUIPMENT, UTENSILs, LINENS, or SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114185.2', 'Clean linens', 'Clean LINENS shall be free of FOOD residues and other soiling matter.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114185.3', 'Laundering specifications', '(a) LINENS that do not come in direct contact with FOOD shall be laundered
            when they become wet, sticky, or visibly soiled.

      (b) Cloth gloves shall be laundered before being used with a different type of
            raw FOOD of animal origin such as beef, lamb, pork, FISH and
            POULTRY.

      (c) Cloth napkins shall be laundered between each use.
      (d) Wet wiping cloths shall be laundered daily.
      (e) Dry wiping cloths shall be laundered as necessary to prevent

            contamination of FOOD and clean serving UTENSILs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114185.4', 'Storage of linens', '(a) Adequate and suitable space shall be provided for the storage of clean
            LINENS.

      (b) Soiled LINENS shall be kept in clean, nonabsorbent receptacles or clean,
            washable laundry bags and stored and transported to prevent
            contamination of FOOD, clean EQUIPMENT, clean UTENSILs, and
            SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114185.5', 'Use of laundry facilities', '(a) Laundry facilities on the PREMISES of a FOOD FACILITY shall be used
            only for the washing and drying of items used in the operation of the
            establishment.

      (b) If work clothes or LINENS are laundered on the PREMISES, a
            mechanical clothes washer and dryer shall be provided and used.

      (c) If wiping cloths are laundered on the PREMISES, they shall be laundered
            in a mechanical clothes washer and dryer or in a WAREWASHING sink
            that is cleaned and sanitized before and after each time it is used to wash
            wiping cloths or wash PRODUCE or thaw FOOD.

                                               113', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "6", "chapter_title": "Equipment, Utensils and Linens", "article": "5", "article_title": "Linens"}'::jsonb),
  ('CalCode', '114189', 'Enforcement of potable water standards', 'The ENFORCEMENT AGENCY may monitor and enforce the potable
drinking water standards in the California Safe Drinking Water Act (Chapter 4
commencing with Section 116275) for purposes of enforcing this part and
compliance with any requirements with regard to POTABLE WATER, as defined
in Section 113869.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114189.1', 'Boiler water additives, criteria', 'Chemicals used as boiler water ADDITIVEs shall meet the requirements
specified in 21 C.F.R. 173.310.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114190', 'Approved plumbing system', 'All plumbing and PLUMBING FIXTUREs shall be installed in compliance
with applicable local plumbing ordinances, shall be maintained so as to prevent
any contamination, and shall be kept clean, fully operative, and in good repair.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114192', 'Approved water supply system', '(a) Except as provided in subdivision (d), an adequate, protected,
            pressurized, potable supply of hot water and COLD WATER shall be
            provided. Hot water shall be supplied at a minimum temperature of at
            least 120�F measured from the faucet, unless otherwise specified in this
            part. The water supply shall be from a water system APPROVED by the
            health officer or the local ENFORCEMENT AGENCY.

      (b) Any hose used for conveying POTABLE WATER shall be constructed of
            nontoxic materials, shall be used for no other purpose, and shall be
            clearly labeled as to its use. The hose shall be stored and used so as to
            be kept free of contamination.

      (c) The POTABLE WATER supply shall be protected with a backflow or back
            siphonage protection device when required by applicable plumbing
            codes. Exposed piping of a nonPOTABLE WATER system shall be
            identified so that it is readily distinguishable from piping that carries
            POTABLE WATER.

      (d) A FOOD FACILITY may provide only WARM WATER if the water supply
            is used only for HANDWASHING, as required in Section 113953.

                                               114', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114192.1', 'Pressure', '(a) Water under pressure shall be permanently plumbed to all fixtures,
            EQUIPMENT, and nonFOOD EQUIPMENT that are required to use
            water, except for water supplied to NONPERMANENT FOOD
            FACILITIES.

      (b) Water under pressure shall be provided at a sufficient level as specified
            by the Uniform Plumbing Code and manufacturer''s specifications for
            EQUIPMENT and fixtures in the FOOD FACILITY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114193', 'Backsiphonage prevention', '(a) All steam tables, ice machines and bins, FOOD PREPARATION sinks,
            WAREWASHING sinks, display cases, walk-in REFRIGERATION
            UNITs, and other similar EQUIPMENT that discharge liquid waste shall
            be drained by means of indirect waste pipes, and all wastes drained by
            them shall discharge through an airgap into a floor sink or other
            APPROVED type of receptor.

      (b) Drainage from reach-in REFRIGERATION UNITs shall be conducted in
            a sanitary manner to a floor sink or other APPROVED device by an
            indirect connection or to a properly installed and functioning evaporator.

      (c) Indirect waste receptors shall be located to be readily accessible for
            inspection and cleaning.

      (d) WAREWASHING machines may be connected directly to the sewer
            immediately downstream from a floor drain, or they may be drained
            through an APPROVED indirect connection.

      (e) WAREWASHING sinks in use on January 1, 1996, that are directly
            plumbed may be continued in use. This section does not require
            WAREWASHING sinks to be indirectly plumbed when the local building
            official determines that the sink should be directly plumbed.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114193.1', 'Backflow prevention methods', 'An air gap between the water supply inlet and the flood level rim of the
PLUMBING FIXTURE, EQUIPMENT, or nonFOOD EQUIPMENT shall be at least
twice the diameter of the water supply inlet and may not be less than one inch.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114195', 'Capacity', '(a) The water source and system shall be of sufficient capacity to meet the
            peak water demands of the FOOD FACILITY.

      (b) Hot water generation and distribution systems shall be sufficient to meet
            the peak hot water demands throughout the FOOD FACILITY.

                                               115', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "1", "article_title": "Water"}'::jsonb),
  ('CalCode', '114197', 'Approved liquid waste disposal system', 'Liquid waste shall be disposed of through the APPROVED PLUMBING
SYSTEM and shall discharge into the public sewerage or into an APPROVED
private sewage disposal system.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "2", "article_title": "Liquid Waste"}'::jsonb),
  ('CalCode', '114199', 'Equipment compartments, drainage', 'EQUIPMENT compartments that are subject to accumulation of moisture
due to conditions such as condensation, FOOD or BEVERAGE drip, or water from
melting ice, shall be sloped to an outlet that allows for complete draining.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "2", "article_title": "Liquid Waste"}'::jsonb),
  ('CalCode', '114201', 'Grease trap/interceptor', '(a) If provided, a grease trap or grease interceptor shall not be located in a
            FOOD or UTENSIL handling area unless specifically APPROVED by the
            ENFORCEMENT AGENCY.

      (b) Grease traps and grease interceptors shall be easily accessible for
            servicing.

      (c) Notwithstanding subdivision (a), those FOOD FACILITIES APPROVED
            with a grease trap or grease interceptor that are in operation before the
            effective date of this part are not required to comply with this section.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "2", "article_title": "Liquid Waste"}'::jsonb),
  ('CalCode', '114205', 'Potable water and wastewater tanks', '(a) NONPERMANENT FOOD FACILITIES that handle nonPREPACKAGED
            FOOD shall be equipped with POTABLE WATER and wastewater tanks,
            unless APPROVED temporary water and wastewater connections are
            provided.

      (b) PERMANENT FOOD FACILITIES shall be in compliance with Sections
            114190 to 114201, inclusive.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114207', 'Potable water and wastewater tanks, approved', 'Materials that are used in the construction of POTABLE WATER and
wastewater tanks and appurtenances shall be safe, durable, corrosion-resistant,
nonabsorbent, and finished to have a SMOOTH, EASILY CLEANABLE surface.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114209', 'Potable water and wastewater tanks, drainage', 'POTABLE WATER tanks and wastewater tanks shall be sloped to an
outlet that ensures complete drainage of the tank and designed and constructed

                                               116
so as to be easily and completely drained.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114211', 'Potable water and wastewater tanks, protection from', 'contamination

      (a) The water system shall be designed and constructed using materials that
            enable water to be introduced without contamination.

      (b) All tanks, line couplings, valves, and all other plumbing shall be designed,
            installed, maintained, and constructed of materials that will not
            contaminate the water supply, FOOD, UTENSILs, or EQUIPMENT.

      (c) All waste lines shall be connected to wastewater tanks with watertight
            seals.

      (d) Any connection to a wastewater tank shall preclude the possibility of
            contaminating any FOOD, FOOD-CONTACT SURFACE, or UTENSIL.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114213', 'Potable water and wastewater tanks, tank vent, protected', '(a) Any POTABLE WATER or wastewater tank mounted within a MOBILE
            FOOD FACILITY or MOBILE SUPPORT UNIT shall have an air vent
            overflow provided in a manner that will prevent potential flooding of the
            interior of the facility.

      (b) If provided, a water tank vent shall terminate in a downward direction and
            shall be covered with 16 mesh per square inch screen or equivalent when
            the vent is in a protected area or a protective filter when the vent is in an
            area that is not protected from windblown dirt and debris.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114215', 'Nonpermanent food facilities, hose, construction and', 'identification

            Hoses used in conjunction with NONPERMANENT FOOD FACILITIES
shall meet all of the following requirements:

      (a) A hose used for conveying POTABLE WATER from a water tank shall be:
                  (1) Safe.
                  (2) Durable, corrosion-resistant, and nonabsorbent.
                  (3) Resistant to pitting, chipping, crazing, scratching, scoring,
                        distortion, and decomposition.
                  (4) Finished with a SMOOTH interior surface.
                  (5) Protected from contamination at all times.
                  (6) Clearly and durably identified as to its use if not permanently
                        attached.

      (b) Liquid waste lines shall not be the same color as hoses used for
            POTABLE WATER.

      (c) Hoses used on a MOBILE FOOD FACILITY or a MOBILE SUPPORT
            UNIT and POTABLE WATER tank connectors shall have matching
            connecting devices. Devices for external cleaning shall not be used for
            POTABLE WATER purposes on the MOBILE FOOD FACILITY. Hoses

                                               117
            and faucets equipped with quick connect and disconnect devices for
            these purposes shall be deemed to meet the requirements of this
            subdivision. Exterior hose-connection valves shall be attached to
            MOBILE FOOD FACILITIES or MOBILE SUPPORT UNITs and shall be
            located above the ground with an APPROVED water connection.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114217', 'Potable water tanks, capacity', '(a) A POTABLE WATER tank of sufficient capacity to furnish an adequate
            quantity of POTABLE WATER for FOOD PREPARATION,
            WAREWASHING, and handwashing purposes shall be provided for
            nonpermanent FOOD FACILITIES.

      (b) At least five gallons of water shall be provided exclusively for
            handwashing for each NONPERMANENT FOOD FACILITY. Any water
            need for other purposes shall be in addition to the five gallons for
            handwashing.

      (c) Except as specified in subdivision (d), at least 25 gallons of water shall
            be provided for FOOD PREPARATION and WAREWASHING.

      (d) At least 15 gallons of water shall be provided for NONPERMANENT
            FOOD FACILITIES that conduct LIMITED FOOD PREPARATION.

      (e) The water delivery system shall deliver at least one gallon per minute to
            each sink basin.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114219', 'Potable water tanks, enclosed system', 'A POTABLE WATER tank shall be enclosed from the filling inlet to the
discharge outlet and emptied to ensure complete drainage of the tank.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114221', 'Potable water tanks, inspection and cleaning port', '(a) Water tanks shall be designed with an access port for inspection and
            cleaning. The access port shall be in the top of the tank and flanged
            upward at least one-half inch and equipped with a port cover assembly
            that is provided with a gasket and a device for securing the cover in place
            and flanged to overlap the opening and sloped to drain.

      (b) Notwithstanding subdivision (a), water tanks that are not accessible for
            inspection may comply with this section by submitting written operational
            procedures for the cleaning and sanitizing of the POTABLE WATER tank.
            The ENFORCEMENT AGENCY shall review and approve the procedures
            prior to implementation and an APPROVED copy shall be kept on the
            MOBILE FOOD FACILITY during hours of operation.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114223', 'Potable water tanks, "V" type threads, use limitation', 'A fitting with "V" type threads on a water tank inlet or outlet shall be
allowed only when a hose is permanently attached.

                                               118', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114225', 'Potable water tanks, inlet and outlet', '(a) POTABLE WATER tanks shall be installed in a manner that will allow
            water to be filled with an easily accessible inlet.

      (b) A POTABLE WATER tank''s inlet and outlet shall be positioned so that
            they are protected from contaminants such as waste discharge, dust, oil,
            or grease.

      (c) NONPERMANENT FOOD FACILITIES shall be provided with a
            connection of a size and type that will prevent its use for any other service
            and shall be constructed so that backflow and other contamination of the
            water supply is prevented.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114227', 'Potable water tanks, filter', 'A filter that does not pass oil or oil vapors shall be installed in the air
supply line between the compressor and POTABLE WATER system when
compressed air is used to pressurize the water tank system.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114229', 'Potable water tanks, protective cover or device', 'If not in use, a POTABLE WATER tank and hose inlet and outlet fitting
shall be protected using a cap and keeper chain, quick disconnect, closed cabinet,
closed storage tube, or other APPROVED protective cover or device.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114231', 'Potable water tank inlet', 'A NONPERMANENT FOOD FACILITY''s POTABLE WATER tank inlet
shall be three-fourths inch in inner diameter or less and provided with a hose
connection of a size or type that will prevent its use for any other service.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114233', 'Potable water tanks, system flushing and disinfection', 'A water tank, pump, and hoses shall be flushed and sanitized before
being placed in service after construction, repair, modification, and periods of
nonuse.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114235', 'Potable water tank, using a pump and hoses, backflow', 'prevention

            A PERSON shall operate a water tank, pump, and hoses so that backflow
and other contamination of the water supply are prevented.

                                               119', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114238', 'Potable water tanks, tank, pump, and hoses dedication', 'A water tank, pump, and hoses used for conveying POTABLE WATER
shall not be used for any other purpose.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114239', 'Potable water tanks, refilling and storage', '(a) POTABLE WATER tanks may be constructed in a manner that will allow
            for a POTABLE WATER tank to be removed from within the
            NONPERMANENT FOOD FACILITY compartments for refilling or
            replacing.

      (b) Refilling of a POTABLE WATER tank shall be conducted through an
            APPROVED and sanitary method, such as at the COMMISSARY.

      (c) Storage of any prefilled water tank, or empty and clean water tanks, or
            both, shall be within the NONPERMANENT FOOD FACILITY or in an
            APPROVED manner that will protect against contamination.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114240', 'Wastewater tanks, capacity and drainage', '(a) Wastewater tanks shall be of a capacity commensurate with the level of
            FOOD handling activity.

      (b) Wastewater tanks shall have a minimum capacity that is 50 percent
            greater than the POTABLE WATER tanks. In no case shall the
            wastewater capacity be less than 7.5 gallons. Where POTABLE WATER
            for the preparation of a FOOD or BEVERAGE is supplied, an additional
            wastewater tank capacity equal to at least 15 percent of the water supply
            shall be provided.

      (c) Additional wastewater tank capacity may be required where wastewater
            production is likely to exceed tank capacity.

      (d) Where ice is utilized in the storage, display, or service of FOOD or
            BEVERAGEs, an additional minimum wastewater holding tank shall be
            provided with a capacity equal to one-third of the volume of the ice cabinet
            to accommodate the drainage of ice melt.

      (e) Wastewater tanks on nonpermanent FOOD FACILITIES shall be
            equipped with a shut-off valve.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114241', 'Wastewater tanks, removing wastes', '(a) Wastewater tanks may be constructed in a manner that will allow the
            wastewater tank to be removed from within the APPROVED
            NONPERMANENT FOOD FACILITY compartments for replacing.

      (b) RETAIL FOOD operations shall cease during removal and replacement
            of tanks.

      (c) Sewage and other liquid wastes shall be removed from a
            NONPERMANENT FOOD FACILITY at an APPROVED waste servicing
            area or by an APPROVED sewage transport vehicle in such a way that a
            public health HAZARD or nuisance is not created.

                                               120', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114242', 'Wastewater tanks, flushing', 'Wastewater tanks shall be thoroughly flushed and drained in a sanitary
manner during the servicing operation.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "3", "article_title": "Mobile Water and Wastewater Tanks"}'::jsonb),
  ('CalCode', '114244', 'Receptacles, capacity and availability', '(a) Each FOOD FACILITY shall be provided with any facilities and
            EQUIPMENT necessary to store or dispose of all waste material.

      (b) Waste receptacles shall be provided for use by CONSUMERs.
      (c) A receptacle shall be provided in each area of the FOOD FACILITY or

            PREMISES where REFUSE is generated or commonly discarded, or
            where recyclables or returnables are placed.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245', 'Storage areas, receptacles and waste handling units, location', '(a) An area designated for REFUSE, recyclables, returnables, and a
            redeeming machine for recyclables or returnables shall be located so that
            it is separate from FOOD, EQUIPMENT, UTENSILs, LINENS, and single-
            service and SINGLE-USE ARTICLES and a public health HAZARD or
            nuisance is not created.

      (b) Receptacles and waste handling units for REFUSE, recyclables, and
            returnables shall not be located so as to create a public health HAZARD
            or nuisance or interfere with the cleaning of adjacent space.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.1', 'Disposal of refuse', '(a) All REFUSE, recyclables, and returnables shall be kept in nonabsorbent,
            durable, cleanable, leakproof, and rodentproof containers and shall be
            contained so as to minimize odor and insect development by covering
            with close-fitting lids or placement in a disposable bag that is impervious
            to moisture and then SEALED.

      (b) REFUSE containers inside a FOOD FACILITY need not be covered
            during periods of operation.

      (c) All REFUSE shall be removed and disposed of in a sanitary manner as
            frequently as may be necessary to prevent the creation of a nuisance.

      (d) Storage areas, enclosures, and receptacles for REFUSE, recyclables,
            and returnables shall be maintained in good repair.

      (e) REFUSE, recyclables, and returnables shall be removed from the
            PREMISES at a frequency that will minimize the development of
            objectionable odors and other conditions that attract or harbor insects and
            rodents.

                                               121', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.2', 'Outside storage prohibitions', 'Cardboard or other packaging material that does not contain FOOD
residues and that is awaiting regularly scheduled delivery to a recycling or disposal
site may be stored outside without being in a covered receptacle if it is stored so
that it does not create a rodent harborage problem.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.3', 'Indoor storage area for refuse, recyclables, and returnables', 'If located within the FOOD FACILITY, a storage area for REFUSE,
recyclables, and returnables shall meet the requirements for floors, walls, ceilings,
and VERMIN exclusion as specified in this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.4', 'Outdoor refuse area', 'If provided, an outdoor storage area or enclosure used for REFUSE,
recyclables, and returnables shall be constructed of nonabsorbent material such
as concrete or asphalt and shall be EASILY CLEANABLE, durable, and sloped to
drain.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.5', 'Outside receptacle', 'Receptacles and waste handling units for REFUSE and recyclables shall
be installed so that accumulation of debris and insect and rodent attraction and
harborage are minimized and effective cleaning is facilitated around and, if the unit
is not installed flush with the base pad, under the unit.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.6', 'Cleaning receptacles', '(a) Receptacles and waste handling units for REFUSE, recyclables, and
            returnables shall be thoroughly cleaned in a way that does not
            contaminate FOOD, EQUIPMENT, UTENSILs, LINENS, or single-service
            and SINGLE-USE ARTICLES, and wastewater shall be disposed of as
            specified under Section 114241.

      (b) Soiled receptacles and waste handling units for REFUSE, recyclables,
            and returnables shall be cleaned at a frequency necessary to prevent
            them from developing a buildup of soil or becoming attractants for insects
            and rodents.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114245.7', 'Refuse cleaning implements and supplies', '(a) Except as specified in subdivision (b), suitable cleaning implements and
            supplies such as high pressure pumps, hot water, steam, and detergent
            shall be provided as necessary for effective cleaning of receptacles and
            waste handling units for REFUSE, recyclables, and returnables.

      (b) If APPROVED, off-PREMISES-based cleaning services may be used if
            on-PREMISES cleaning implements and supplies are not provided.

                                               122', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "7", "chapter_title": "Water, Plumbing and Waste", "article": "4", "article_title": "Refuse"}'::jsonb),
  ('CalCode', '114250', 'Toilet facilities', 'Clean toilet rooms in good repair shall be provided and conveniently
located and accessible for use by EMPLOYEEs during all hours of operation. The
number of toilet facilities required shall be in accordance with applicable local
building and plumbing ordinances. Toilet tissue shall be provided in a permanently
installed dispenser at each toilet.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "1", "article_title": "Toilet Facilities"}'::jsonb),
  ('CalCode', '114250.1', 'Toilet and handwashing facilities for individual facilities within', 'larger premises

      (a) FOOD FACILITIES located within amusement parks, stadiums, arenas,
            FOOD courts, fairgrounds, and similar PREMISES shall not be required
            to provide toilet facilities for EMPLOYEE use within each FOOD
            FACILITY if APPROVED toilet facilities are located within 200 feet in
            travel distance of each FOOD FACILITY and are readily available for use
            by EMPLOYEEs. FOOD FACILITIES subject to this section shall be
            provided with APPROVED handwashing facilities for EMPLOYEE use.

      (b) Notwithstanding subdivision (a), FOOD FACILITIES APPROVED prior to
            the effective date of this part with toilet facilities within 300 feet are not
            required to meet the 200 foot requirement.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "1", "article_title": "Toilet Facilities"}'::jsonb),
  ('CalCode', '114252', 'Lighting', 'In every room and area in which any FOOD is prepared, manufactured,
processed, or prepackaged, or in which EQUIPMENT or UTENSILs are cleaned,
sufficient natural or artificial lighting shall be provided to produce the following light
intensity, while the area is in use:

      (a) At least 10 foot candles for the following:
                  (1) At least 30 inches above the floor, in walk-in REFRIGERATION
                        UNITs and dry FOOD storage areas.
                  (2) At a working surface on which alcoholic BEVERAGEs are
                        prepared or where UTENSILs used in the preparation or service
                        of alcoholic BEVERAGEs are cleaned.
                  (3) Inside EQUIPMENT, such as reach-in or under-the-counter
                        refrigerators.

      (b) At least 20 foot candles for the following:
                  (1) At a surface where FOOD is provided for CONSUMER self-
                        service or where fresh PRODUCE or PREPACKAGED FOODs
                        are sold or offered for consumption.
                                               123
                  (2) In server stations where FOOD is prepared.
                  (3) At a distance of 30 inches above the floor in areas used for

                        handwashing, WAREWASHING, and EQUIPMENT and
                        UTENSIL storage, and in toilet rooms.
                  (4) In all areas and rooms during periods of cleaning.
      (c) Except in server stations where FOOD is prepared, at least 50 foot
            candles at a SURFACE where a FOOD EMPLOYEE is working with
            FOOD or working with UTENSILS and EQUIPMENT such as knives,
            slicers, grinders, or saws where EMPLOYEE safety is a factor.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "2", "article_title": "Lighting"}'::jsonb),
  ('CalCode', '114252.1', 'Light bulbs, protective shielding', '(a) Except as specified in subdivision (b), light bulbs shall be shielded,
            coated, or otherwise shatter-resistant in areas where there is
            nonprepackaged READY-TO-EAT FOOD, clean EQUIPMENT,
            UTENSILs, and LINENS, or unwrapped SINGLE-USE ARTICLES.

      (b) Shielded, coated, or otherwise shatter-resistant bulbs need not be used
            in areas used only for storing PREPACKAGED FOOD in unopened
            packages, if the integrity of the packages cannot be affected by broken
            glass falling onto them and the packages are capable of being cleaned of
            debris from broken bulbs before the packages are opened.

      (c) Infrared and other heat lamps shall be protected against breakage by a
            shield surrounding and extending beyond the bulb so that only the face
            of the bulb is exposed, or by using APPROVED coated shatter resistant
            bulbs.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "2", "article_title": "Lighting"}'::jsonb),
  ('CalCode', '114254', 'Poisonous or injurious materials; use and storage', 'Only those insecticides, rodenticides, and other pesticides that are
necessary and specifically APPROVED for use in a FOOD FACILITY may be used.
The use shall be in accordance with the manufacturer''s instructions.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "3", "article_title": "Poisonous and Toxic Materials"}'::jsonb),
  ('CalCode', '114254.1', 'Original container identifying information, prominence', '(a) Containers of POISONOUS OR TOXIC MATERIALS and PERSONAL
            CARE ITEMS shall bear a legible manufacturer''s label.

      (b) Working containers used for storing POISONOUS OR TOXIC
            MATERIALS such as cleaners and sanitizers taken from bulk supplies
            shall be clearly and individually identified with the common name of the
            material.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "3", "article_title": "Poisonous and Toxic Materials"}'::jsonb),
  ('CalCode', '114254.2', 'Separation', '(a) Except as specified in subdivision (b), POISONOUS OR TOXIC

                                               124
            MATERIALS shall be stored or displayed so they cannot contaminate
            FOOD, EQUIPMENT, UTENSILs, LINENS, and SINGLE-USE
            ARTICLES by separating the POISONOUS OR TOXIC MATERIALS by
            spacing or partitioning and locating the POISONOUS OR TOXIC
            MATERIALS in an area that is not above FOOD, EQUIPMENT,
            UTENSILs, LINENS, and SINGLE-USE ARTICLES.
      (b) EQUIPMENT and UTENSIL cleaners and sanitizers may be stored in
            WAREWASHING areas for availability and convenience if the materials
            are stored to prevent contamination of FOOD, EQUIPMENT, UTENSILs,
            LINENS, and SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "3", "article_title": "Poisonous and Toxic Materials"}'::jsonb),
  ('CalCode', '114254.3', 'Poisonous or toxic material containers', 'A container previously used to store POISONOUS OR TOXIC
MATERIALS shall not be used to store, transport, or dispense FOOD, UTENSILs,
or SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "3", "article_title": "Poisonous and Toxic Materials"}'::jsonb),
  ('CalCode', '114256', 'Designated employee areas', '(a) Areas designated for EMPLOYEEs to eat and drink shall be located so
            that FOOD, EQUIPMENT, LINENS, and SINGLE-USE ARTICLES are
            protected from contamination.

      (b) Lockers or other suitable facilities shall be located in a designated room
            or area where contamination of FOOD, EQUIPMENT, UTENSILs,
            LINENS, and SINGLE-USE ARTICLES cannot occur.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "4", "article_title": "Employee Storage Areas"}'::jsonb),
  ('CalCode', '114256.1', 'Dressing rooms and lockers', '(a) Lockers or other suitable facilities shall be provided and used for the
            orderly storage of EMPLOYEE clothing and other possessions.

      (b) Dressing rooms or dressing areas shall be provided and used by
            EMPLOYEEs if the EMPLOYEEs regularly change their clothes in the
            facility.

      (c) RESTRICTED FOOD SERVICE FACILITIES and NONPERMANENT
            FOOD FACILITIES shall not be required to comply with subdivision (a),
            but no person shall store clothing or personal effects in any area used for
            the storage and preparation of FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "4", "article_title": "Employee Storage Areas"}'::jsonb),
  ('CalCode', '114256.2', 'Medicines, restriction and storage', 'Medicines that are in a FOOD FACILITY for the EMPLOYEEs'' use shall
be labeled and stored so as to prevent the contamination of FOOD, EQUIPMENT,
UTENSILs, LINENS, and SINGLE-USE ARTICLES. This section does not apply

                                               125
to medicines that are stored or displayed for RETAIL sale.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "4", "article_title": "Employee Storage Areas"}'::jsonb),
  ('CalCode', '114256.4', 'Storage of first aid supplies', 'First aid supplies that are in a FOOD FACILITY for the EMPLOYEEs'' use
shall be labeled with a legible manufacturer''s label and stored in a kit or a container
that is located to prevent the contamination of FOOD, EQUIPMENT, UTENSILs,
LINENS, and SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "4", "article_title": "Employee Storage Areas"}'::jsonb),
  ('CalCode', '114257', 'All facilities, equipment, and utensils to be kept clean,', 'operative, and in good repair

            All PREMISES of a FOOD facility shall be kept clean, fully operative, and
in good repair.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "5", "article_title": "Premises and Facilities"}'::jsonb),
  ('CalCode', '114257.1', 'Maintaining premises, unnecessary items and litter', 'The PREMISES of a FOOD FACILITY shall be free of litter and items that
are unnecessary to the operation or maintenance of the facility, such as
EQUIPMENT that is nonfunctional or no longer used.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "5", "article_title": "Premises and Facilities"}'::jsonb),
  ('CalCode', '114259', 'Exclusion of vermin', 'A FOOD FACILITY shall at all times be constructed, equipped,
maintained, and operated as to prevent the entrance and harborage of animals,
birds, and VERMIN, including, but not limited to, rodents and insects.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114259.1', 'Vermin', 'The PREMISES of each FOOD FACILITY shall be kept free of VERMIN.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114259.2', 'Pass-thru window service openings', 'Pass-thru window service openings shall be limited to 216 square inches
each. The service openings shall not be closer together than 18 inches. Each
opening shall be provided with a solid or screened window, equipped with a self-
closing device. Screening shall be at least 16 mesh per square inch. Pass-thru
windows of up to 432 square inches are APPROVED if equipped with an air curtain
device. The counter surface of the service openings shall be SMOOTH and
EASILY CLEANABLE.

                                               126', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114259.3', 'Insect control devices, design and installation', '(a) Insect control devices that are used to electrocute or stun flying insects
            shall be designed to retain the insect within the device.

      (b) Insect control devices shall be installed so that the devices are not located
            over a FOOD or UTENSIL handling area and dead insects and insect
            fragments are prevented from being impelled onto or falling on
            nonPREPACKAGED FOOD, clean EQUIPMENT, UTENSILs, LINENS,
            and unwrapped SINGLE-USE ARTICLES.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114259.4', 'Animal handling prohibition', '(a) Except as specified in subdivision (b), FOOD EMPLOYEEs shall not care
            for or handle animals that may be present, such as patrol dogs, SERVICE
            ANIMALs, or pets that are allowed as specified in subdivision (b) of
            Section 114259.5.

      (b) FOOD EMPLOYEEs with SERVICE ANIMALs may handle or care for
            their SERVICE ANIMALs if they wash their hands as required in this part.
            FOOD EMPLOYEEs may handle or care for FISH in aquariums or
            MOLLUSCAN SHELLFISH or crustacea in display tanks if they wash their
            hands as required in this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114259.5', 'Prohibiting animals', '(a) Except as specified in this section, live animals may not be allowed in a
            FOOD FACILITY.

      (b) Live animals may be allowed in any of the following situations if the
            contamination of FOOD, clean EQUIPMENT, UTENSILs, LINENS, and
            unwrapped SINGLE-USE ARTICLES cannot result:
                  (1) Edible FISH or decorative FISH in aquariums, shellfish or
                        crustacea on ice or under refrigeration, and shellfish and
                        crustacea in display tank systems.
                  (2) Animals intended for consumption if the live animals are kept
                        separate from all FOOD and UTENSIL handling areas, are held
                        in sanitary conditions, are slaughtered in a separate room
                        designed solely for that purpose and separated from other
                        FOOD and UTENSIL handling areas, and maintained in an area
                        that has ventilation separate from FOOD and UTENSIL handling
                        areas.
                  (3) Dogs under the control of a uniformed law enforcement officer
                        or of uniformed employees of private patrol operators and
                        operators of a private patrol service who are licensed pursuant
                        to Chapter 11.5 (commencing with Section 7580) of Division 3
                        of the Business and Professions Code, while those
                        EMPLOYEEs are acting within the course and scope of their

                                               127
                  employment as private patrol PERSONs.
            (4) In areas that are not used for FOOD PREPARATION and that

                  are usually open for CONSUMERS, such as dining and sales
                  areas, SERVICE ANIMALs that are controlled by a disabled
                  EMPLOYEE or PERSON, if a health or safety HAZARD will not
                  result from the presence or activities of the SERVICE ANIMAL.
            (5) Pets in the common dining areas of RESTRICTED FOOD
                  service facilities at times other than during meals if all of the
                  following conditions are satisfied:
                  (A) Effective partitioning and self-closing doors separate the

                        common dining areas from FOOD storage or FOOD
                        PREPARATION areas.
                  (B) CONDIMENTs, EQUIPMENT, and UTENSILs are stored in
                        enclosed cabinets or removed from the common dining
                        areas when pets are present.
                  (C) Dining areas including tables, countertops, and similar
                        surfaces are effectively cleaned before the next meal
                        service.
            (6) In areas that are not used for FOOD PREPARATION, storage,
                  sales, display, or dining, in which there are caged animals or
                  animals that are similarly restricted, such as in a variety store
                  that sells pets or a tourist park that displays animals.
            (7) If kept at least 20 feet (6 meters) away from any MOBILE FOOD
                  FACILITY, TEMPORARY FOOD FACILITY, or CERTIFIED
                  FARMERS'' MARKET.
(c) Those PERSONs and operators described in paragraphs (3) and (4) of
      subdivision (b) are liable for any damage done to the PREMISES or
      facilities by the dog.
(d) Pet dogs under the control of a person in an outdoor dining area if all of
      the following conditions are satisfied:
            (1) The owner of the FOOD FACILITY elects to allow pet dogs in its
                  outdoor dining area.
            (2) A separate outdoor entrance is present where pet dogs enter
                  without going through the FOOD establishment to reach the
                  outdoor dining area and pet dogs are not allowed on chairs,
                  benches, seats, or other fixtures.
            (3) The outdoor dining area is not used for FOOD or drink preparation
                  or the storage of UTENSILS. A FOOD EMPLOYEE may refill a
                  BEVERAGE glass in the outdoor dining area from a pitcher or
                  other container.
            (4) FOOD and water provided to pet dogs shall only be in single-use
                  disposable containers.
            (5) FOOD EMPLOYEEs are prohibited from having direct contact
                  with pet dogs while on duty. A FOOD EMPLOYEE who does
                  have that prohibited direct contact shall wash his or her hands
                  as required by Section 113953.3.

                                         128
                  (6) The outdoor dining area is maintained clean. Surfaces that have
                        been contaminated by dog excrement or other bodily fluids shall
                        be cleaned and sanitized.

                  (7) The pet dog is on a leash or confined in a pet carrier and is under
                        the control of the pet dog owner.

                  (8) The food facility owner ensures compliance with local ordinances
                        related to sidewalks, public nuisance, and sanitation.

                  (9) Other control measures approved by the ENFORCEMENT
                        AGENCY.

      (e) Live or dead FISH bait may be stored if contamination of FOOD, clean
            equipment, UTENSILS, linens, and unwrapped SINGLE-USE ARTICLES
            cannot result.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "8", "chapter_title": "Physical Facilities", "article": "6", "article_title": "Vermin and Animals"}'::jsonb),
  ('CalCode', '114265', 'Applicable requirements', 'All PERMANENT FOOD FACILITIES shall meet the applicable
requirements in Chapters 1 to 8, inclusive, and Chapter 13, unless specifically
exempted from any of these provisions.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities"}'::jsonb),
  ('CalCode', '114266', 'Food facilities, enclosed', '(a) Each PERMANENT FOOD FACILITY shall be fully enclosed in a building
            consisting of permanent floors, walls, and an overhead structure that
            meet the minimum standards as prescribed by this part. FOOD
            FACILITIES that are not fully enclosed on all sides and that are in
            operation on January 1, 1985, shall not be required to meet the
            requirements of this section until the facility is REMODELed or has a
            significant MENU CHANGE or significant change in its method of
            operation.

      (b) Notwithstanding subdivision (a), this section does not require the
            enclosure of dining areas or any other operation APPROVED for outdoor
            FOOD service.

      (c) Notwithstanding subdivision (a), a PRODUCE STAND that was in
            operation prior January 1, 2007, shall have no more than one side open
            to the outside air during business hours.

      (d)
                  (1) Notwithstanding subdivision (a), a restaurant, which for these
                        purposes shall have the same meaning as is provided for the
                        term "bona fide public eating place" in Section 23038 of the
                        Business and Professions Code, may operate using open
                        windows, folding doors, or nonfixed store fronts during hours of
                        operation if the restaurant develops an integrated pest
                                               129
      management and food safety risk mitigation plan, which shall be
      submitted to the enforcement agency for approval before
      operation, and it meets both of the following requirements:

            (A) The facility shall be fully enclosed during hours of
                  nonoperation

            (B) The restaurant shall have the ability to operate while
                  the facility is fully enclosed, as necessary.

(2) The integrated pest management and food safety risk mitigation
     plan shall be documented in writing and made available upon
     request to local environmental health enforcement officers.

(3) The integrated pest management and food safety risk mitigation
      plan shall include, at a minimum, the following components:
            (A) A risk assessment that includes a comprehensive
                  evaluation of the facility''s layout, operations, storage
                  practices, and surrounding environment in order to
                  identify areas and practices that pose a risk of VERMIN
                  infestation.
            (B) Control procedures that include preventive and
                  responsive measures to eliminate conditions that
                  attract or harbor VERMIN, such as trash and compost
                  control, that respond to conditions that can lead to food
                  contamination, such as dust and debris, and that
                  ensure a clean and sanitary facility.
            (C) Ongoing monitoring procedures for regularly inspecting
                  and documenting VERMIN activity, problem areas, and
                  effectiveness of implemented controls, and that
                  requires monitoring to occur at a frequency that is
                  appropriate to the level of identified risk.
            (D) Training for all employees upon hire and annually, on
                  pest prevention practices, the restaurant''s pest control
                  procedures, and the employee''s individual
                  responsibilities in maintaining a VERMIN-free
                  environment.
            (E) Record keeping that includes maintaining the following
                  records that shall be made available upon request to
                  local environmental health officers:
                        (i) A description of dates and times of self-closure
                           events related to VERMIN activities.
                        (ii) Dates of all site visits, and description of
                            exclusion or treatment events performed, by a
                            certified pest control operator and copies of
                            detailed receipts associated with those visits,
                            which shall be kept onsite for 12 months.

(4) The restaurant shall review and update the plan annually or
      whenever there is a change to the facility or operation.

(5) The restaurant shall self-close upon observation of VERMIN
      activity inside the facility, including droppings or markings, and

                              130
                        remain closed and not operated until all VERMIN are eliminated.
                  (6) The local ENFORCEMENT AGENCY shall not unreasonably

                        withhold approval of a proposed pest management and food
                        safety risk mitigation plan. The local ENFORCEMENT AGENCY
                        shall make every reasonable effort to identify conditions,
                        operational practices, or mitigation measures that would allow
                        the proposed open-front facility configuration to operate safely.
                        Approval shall be granted unless the agency demonstrates,
                        based upon substantial evidence in the record, that specific,
                        unique circumstances exist in a particular facility such that no
                        reasonable conditions or measures can sufficiently mitigate a
                        significant risk to public health or safety.
                  (7) Nothing in this subdivision limits the existing authority of the local
                        ENFORCEMENT AGENCY pursuant to the California Retail
                        Food Code to suspend or revoke the approval of an integrated
                        pest management and food safety risk mitigation plan if the
                        approved plan is not followed, if VERMIN are observed during
                        an inspection, or if complaints of VERMIN presence are verified.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114268', 'Floors', '(a) Except in sales areas and as otherwise specified in subdivision (d), the
            floor surfaces in all areas in which FOOD is prepared, prepackaged, or
            stored, where any UTENSIL is washed, where REFUSE or garbage is
            stored, where janitorial facilities are located in all toilet and handwashing
            areas, except with respect to areas relating to guestroom
            accommodations and the private accommodations of owners and
            operators in RESTRICTED FOOD SERVICE FACILITIES, shall be
            SMOOTH and of durable construction and nonabsorbent material that is
            EASILY CLEANABLE.

      (b) Floor surfaces shall be coved at the juncture of the floor and wall with a
            3/8 inch minimum radius coving and shall extend up the wall at least 4
            inches, except in areas where FOOD is stored only in unopened bottles,
            cans, cartons, sacks, or other original shipping containers.

      (c) Public or private schools constructed or REMODELed after the effective
            date of this part shall comply with subdivision (b). Public and private
            schools constructed before the effective date of this part need not comply
            with subdivision (b), provided that the existing floor surfaces are
            maintained in good repair and in a sanitary condition.

      (d) Except for dining and serving areas, the use of sawdust, wood shavings,
            peanut hulls, or similar materials is prohibited.

      (e) This section shall not prohibit the use of APPROVED dust-arresting floor
            sweeping and cleaning compounds during floor cleaning operations or
            the use of antislip floor finishes or materials in areas where necessary for
            safety reasons.

                                               131', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114268.1', 'Cleaning floors, dustless methods', '(a) Except as specified in subdivision (b), only dustless methods of cleaning
            such as wet cleaning, vacuum cleaning, mopping with treated dust mops,
            or sweeping using a broom and dust-arresting compounds shall be used
            in FOOD FACILITIES.

      (b) Spills or drippage on floors that occur between normal floor cleaning
            times may be cleaned without the use of dust-arresting compounds and,
            in the case of liquid spills or drippage, with the use of a small amount of
            absorbent compound such as sawdust or diatomaceous earth applied
            immediately before spot cleaning.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114269', 'Floor drains', '(a) Upon new construction or extensive REMODELing, floor drains shall be
            installed in floors that are water-flushed for cleaning and in areas where
            pressure spray methods for cleaning EQUIPMENT are used. Floor
            surfaces in areas pursuant to this subdivision shall be sloped 1:50 to the
            floor drains.

      (b) Upon new construction or extensive REMODELing, floor sinks or
            equivalent devices shall be installed to receive discharges of water or
            other liquid waste from EQUIPMENT.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114271', 'Walls and ceilings', '(a) Except as provided in subdivision (b), the walls and ceilings of all rooms
            shall be of a durable, SMOOTH, nonabsorbent, and EASILY
            CLEANABLE surface.

      (b) This section shall not apply to any of the following areas:
                  (1) Walls and ceilings of bar areas in which alcoholic BEVERAGEs
                        are sold or served directly to the CONSUMERs, except wall
                        areas adjacent to bar sinks and areas where FOOD is prepared.
                  (2) Areas where FOOD is stored only in unopened bottles, cans,
                        cartons, sacks, or other original shipping containers.
                  (3) Dining and sales areas.
                  (4) Offices.
                  (5) Restrooms that are used exclusively by the CONSUMERs,
                        except that the walls and ceilings in the restrooms shall be of a
                        nonabsorbent and washable surface.
                  (6) Dressing room, dressing areas, or locker areas.

      (c) Acoustical paneling may be utilized if it is installed not less than six feet
            above the floor. The paneling shall meet the other requirements of this
            section.

      (d) Conduits of all types shall be installed within walls as practicable. When
            otherwise installed, they shall be mounted or enclosed so as to facilitate
            cleaning.

      (e) Attachments to walls and ceilings, such as light fixtures, mechanical room

                                               132
            ventilation system components, vent covers, wall mounted fans,
            decorative items, and other attachments, shall be EASILY CLEANABLE.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114272', 'Floor covering, mats and duckboards', 'Mats and duckboards shall be designed to be removable and EASILY
CLEANABLE.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "1", "article_title": "Floors, Walls, and Ceilings"}'::jsonb),
  ('CalCode', '114276', 'Toilet and handwashing facilities for employees and patrons', '(a) A PERMANENT FOOD FACILITY shall provide clean toilet facilities in
            good repair for use by EMPLOYEEs.

      (b)
                  (1) A PERMANENT FOOD FACILITY shall provide clean toilet
                        facilities in good repair for CONSUMERs, guests, or invitees
                        when there is onsite consumption of FOODs or when the FOOD
                        FACILITY was constructed after July 1, 1984, and has more
                        than 20,000 square feet of floor space.
                  (2) Notwithstanding Section 113984.1, toilet facilities that are
                        provided for use by CONSUMERs, guests, or invitees shall be
                        in a location where CONSUMERs, guests, and invitees do not
                        pass through FOOD PREPARATION, FOOD storage, or
                        UTENSIL washing areas to reach the toilet facilities.
                  (3) For purposes of this section, a building subject to paragraph(1)
                        that has a FOOD FACILITY with more than 20,000 square feet
                        of floor space shall provide at least one separate toilet facility for
                        men and one separate toilet facility for women.
                  (4) For purposes of this section, the gas pump area of a service
                        station that is maintained in conjunction with a FOOD FACILITY
                        shall not be considered as property used in connection with the
                        FOOD FACILITY or be considered in determining the square
                        footage of floor space of the FOOD FACILITY.

      (c)
                  (1) Toilet rooms shall be separated by well-fitted, self-closing doors
                        that prevent the passage of flies, dust, or odors.
                  (2) Toilet room doors shall be kept closed except during cleaning
                        and maintenance operations.

      (d) Handwashing facilities, in good repair, shall be provided as specified in
            Sections 113953 and 113953.3.

      (e) Any city, county, or city and county may enact ordinances that are more
            restrictive than this section.

      (f)
                  (1) Except as provided in paragraph (1) of subdivision (b), a FOOD
                        FACILITY that was constructed before January 1, 2004, that

                                               133
                        has been in continuous operating since January 1, 2004, and
                        that provides space for the consumption of FOOD on the
                        PREMISES shall either provide clean toilet facilities in good
                        repair for CONSUMERs, guests, or invitees on property used in
                        connection with, or in, the FOOD FACILITY or prominently post
                        a sign within the FOOD FACILITY in a public area stating that
                        toilet facilities are not provided.
                  (2) The first violation of paragraph (1) shall result in a warning.
                        Subsequent violations shall constitute an infraction punishable
                        by a fine of not more than two hundred fifty dollars ($250).
                  (3) The requirements of this section for toilet facilities that are
                        accessible to CONSUMERs, guests, or invitees on the property
                        may be satisfied by permitting access by those PERSONs to the
                        toilet and handwashing facilities that are required by this part.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "2", "article_title": "Toilet Facilities"}'::jsonb),
  ('CalCode', '114279', 'Curbed cleaning facility', '(a) At least one curbed cleaning facility or janitorial sink equipped with HOT
            and COLD WATER and a drain shall be provided and conveniently
            located for the cleaning of mops or similar wet floor cleaning tools and for
            the disposal of mop water and similar liquid waste.

      (b) RESTRICTED FOOD SERVICE FACILITIES shall be exempt from
            subdivision (a) if hot water is available for janitorial purposes and
            wastewater from janitorial activities is disposed of through an
            APPROVED sewage disposal system.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "3", "article_title": "Janitorial Facilities"}'::jsonb),
  ('CalCode', '114281', 'Storage area for cleaning equipment and supplies', 'A room, area, or cabinet separated from any FOOD PREPARATION or
storage area, or WAREWASHING or storage area shall be provided for the storage
of cleaning EQUIPMENT and supplies.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "3", "article_title": "Janitorial Facilities"}'::jsonb),
  ('CalCode', '114282', 'Drying mops', 'After use, mops shall be placed in a position that allows them to air-dry
without soiling walls, EQUIPMENT, or supplies.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "3", "article_title": "Janitorial Facilities"}'::jsonb),
  ('CalCode', '114285', 'Private homes and living or sleeping quarters, use prohibition', '(a) Except as specified in subdivision (b), a private home, a room used as
            living or sleeping quarters, or an area directly opening into a room used
            as living or sleeping quarters shall not be used for conducting FOOD

                                               134
            FACILITY operations.
      (b)

                  (1) Nonperishable, PREPACKAGED FOOD may be given away,
                        sold, or handled from a private home. No FOOD that has
                        exceeded the labeled shelf-life date recommended by the
                        manufacturer shall be deemed to be nonperishable FOOD.

                  (2) For purposes of this subdivision, "nonperishable FOOD" means
                        a FOOD that is not a POTENTIALLY HAZARDOUS FOOD, and
                        that does not show signs of spoiling, becoming rancid, or
                        developing objectionable odors during storage at ambient
                        temperatures.

      (c) RESTRICTED FOOD SERVICE FACILITIES are exempt from
            subdivision (a) provided that no sleeping accommodations shall be
            allowed in any area where FOOD is prepared or stored.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "4", "article_title": "Premises"}'::jsonb),
  ('CalCode', '114286', 'Living or sleeping quarters, separation', '(a) No sleeping accommodations shall be maintained or kept in any room
            where FOOD is prepared, stored, or sold.

      (b) Living or sleeping quarters located on the PREMISES of a FOOD
            FACILITY shall be separated from rooms and areas used for FOOD
            FACILITY operations by complete partitioning. Except for RESTRICTED
            FOOD SERVICE FACILITIES, no door or other opening shall be
            permitted in the partition that separates the FOOD FACILITY from the
            living or sleeping quarters.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "4", "article_title": "Premises"}'::jsonb),
  ('CalCode', '114289', 'Limited square footage for food display areas', '(a) Notwithstanding any law to the contrary, a permanent FOOD FACILITY
            that has less than 300 square feet of display area and that sells only
            PREPACKAGED FOOD that is not POTENTIALLY HAZARDOUS FOOD
            shall be exempt from the requirements of this part except as set forth in
            subdivision (c).

      (b) Notwithstanding any law to the contrary, a premises set aside for beer or
            wine tasting, as that term is defined in Section 23356.1 or23357.3 of the
            Business and Professions Code, that complies with Section 118375, for
            the purposes of wine or beer tasting, regardless of whether there is a
            charge for the wine or beer tasting, if no other BEVERAGE, except for
            bottles of wine or beer and prepackaged nonpotentially hazardous
            BEVERAGEs, is offered for sale or for onsite consumption, and crackers,
            pretzels, or prepackaged FOOD that is not POTENTIALLY HAZARDOUS
            FOOD is offered for sale or for onsite consumption shall be subject to the
            requirements set forth in paragraph (1) of subdivision (c). These facilities

          shall not have a FOOD display area greater than 25 square feet.

                                               135
      (c)
                  (1) A facility or premises with a FOOD display area of 25 square
                        feet or less shall comply with all of the following:
                        (A) Sections 113980, 114047, 114049, 114390, 114393,
                              114395, 114397, and 114399.
                        (B) Chapter 1 (commencing with Section 113700).
                        (C) Chapter 2 (commencing with Section 113728).
                  (2) A permanent FOOD facility with a FOOD display area greater
                        than 25 square feet, but less than 300 square feet, shall comply
                        with all of the following:
                        (A) Sections 113980, 114047, 114049, 114250, 114266,
                              114381, 114387, 114390, 114393, 114395, 114397,
                              114399, 114405, 114407, 114409, 114411, and 114413.
                        (B) Chapter 1 (commencing with Section 113700).
                        (C) Chapter 2 (commencing with Section 113728).', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "5", "article_title": "Prepackaged Nonpotentially Hazardous Food"}'::jsonb),
  ('CalCode', '114289.5', 'Cost recovery', 'The enforcement agency may recover the costs of investigation and
enforcement of this article.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "9", "chapter_title": "Permanent Food Facilities", "article": "5", "article_title": "Prepackaged Nonpotentially Hazardous Food"}'::jsonb),
  ('CalCode', '114380', 'Plan review', '(a) A PERSON proposing to build or REMODEL a FOOD FACILITY shall
            submit complete, easily readable plans drawn to scale, and specifications
            to the ENFORCEMENT AGENCY for review, and shall receive plan
            approval before starting any new construction or REMODELing of a
            facility for use as a RETAIL FOOD FACILITY.

      (b) Plans and specifications may also be required by the ENFORCEMENT
            AGENCY if the agency determines that they are necessary to ensure
            compliance with the requirements of this part, including, but not limited
            to, a MENU CHANGE or change in the facility''s method of operation.
                                               196
(c)
            (1) All new school FOOD FACILITIES or school FOOD FACILITIES
                  that undergo modernization or REMODELing shall comply with
                  all structural requirements of this part. Upon submission of plans
                  by a public school authority, the Division of State Architect and
                  the local ENFORCEMENT AGENCY shall review and approve
                  all new and REMODELed school facilities for compliance with
                  all applicable requirements.
            (2) Notwithstanding subdivision (a), the Office of Statewide Health
                  Planning and Development (OSHPD) shall maintain its primary
                  jurisdiction over licensed skilled nursing facilities, and when new
                  construction, modernization, or remodeling must be undertaken
                  to repair existing systems or to keep up the course of normal or
                  routine maintenance, the facility shall complete a building
                  application and plan check process as required by OSHPD.
                  Approval of the plans by OSHPD shall be deemed compliance
                  with the plan approval process required by the local county
                  ENFORCEMENT AGENCY described in this section.
            (3) Except when a determination is made by the ENFORCEMENT
                  AGENCY that the nonconforming structural conditions pose a
                  public health HAZARD, existing public and private school
                  cafeterias, LIMITED SERVICE CHARITABLE FEEDING
                  OPERATION facilities, and licensed health care facilities shall
                  be deemed to be in compliance with this part pending
                  replacement or renovation.

(d) Except when a determination is made by the ENFORCEMENT AGENCY
      that the nonconforming structural conditions pose a public health
      HAZARD, existing FOOD FACILITIES that were in compliance with the
      LAW in effect on June 30, 2007, shall be deemed to be in compliance
      with the LAW pending replacement or renovation. If a determination is
      made by the ENFORCEMENT AGENCY that a structural condition poses
      a public health HAZARD, the FOOD FACILITY shall remedy the
      deficiency to the satisfaction of the ENFORCEMENT AGENCY.

(e) The plans shall be APPROVED or rejected within 20 working days after
      receipt by the ENFORCEMENT AGENCY and the applicant shall be
      notified of the decision. Unless the plans are APPROVED or rejected
      within 20 working days, they shall be deemed APPROVED. The building
      department shall not issue a building permit for a FOOD facility until after
      it has received plan approval by the ENFORCEMENT AGENCY. This
      section does not require that plans or specifications be prepared by
      someone other than the applicant.

(f) Notwithstanding subdivision (e), a tenant improvement plan for a
      restaurant, as those terms are defined in Section 66345.1 of the
      Government Code, shall be subject to the following procedure:

            (1) If the ENFORCEMENT AGENCY does not approve or deny the
                  plan within 20 business days of receiving a complete plan, the

                                         197
                        plan shall be deemed approved for permitting purposes,
                        provided that all fees and required documents have been
                        submitted.
                  (2) If a complete plan is denied within the 20-business-day period
                        described in paragraph (1), the applicant may resubmit a
                        corrected plan addressing the deficiencies identified in the initial
                        denial. The ENFORCEMENT AGENCY''s review of each
                        subsequent resubmission shall be limited to correcting the
                        deficiencies identified in the initial denial. The ENFORCEMENT
                        AGENCY shall approve or deny each subsequent resubmission
                        within 10 business days of receipt.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114381', 'Permits, fees, and posting', '(a) A FOOD FACILITY shall not be open for business without a valid
            PERMIT.

      (b) A PERMIT shall be issued by the ENFORCEMENT AGENCY when
            investigation has determined that the proposed facility and its method of
            operation meet the specifications of the APPROVED plans or conform to
            the requirements of this part.

      (c) A PERMIT, once issued, is nontransferable. A PERMIT shall be valid only
            for the PERSON, location, type of FOOD sales, or distribution activity
            and, unless suspended or revoked for cause, for the time period
            indicated.

      (d) Any fee for the PERMIT or registration or related services, including, but
            not limited to, the expenses of inspecting and IMPOUNDing any
            UTENSIL suspected of releasing lead or cadmium in violation of Section
            108860 as authorized by Section 114393, review of HACCP PLANs, and
            alternative means of compliance shall be determined by the local
            governing body. Fees shall be sufficient to cover the actual expenses of
            administering and enforcing this part. The moneys collected as fees shall
            only be expended for the purpose of administering and enforcing this part.

      (e) A PERMIT shall be posted in a conspicuous place in the FOOD FACILITY
            or in the office of a VENDING MACHINE business.

      (f) Any PERSON requesting the ENFORCEMENT AGENCY to undertake
            activity pursuant to Sections 114419.1 and 114419.3 shall pay the
            ENFORCEMENT AGENCY''s costs incurred in undertaking the activity.
              The ENFORCEMENT AGENCY''s services shall be assessed at the
              current hourly cost recovery rate.

     (g)
                  (1) Except as otherwise required by state or federal law, an
                        ENFORCEMENT AGENCY shall not provide voluntary consent
                        to any individual to access, review, or obtain any of the
                        ENFORCEMENT AGENCY''s records obtained pursuant to this
                                               198
                        part that include personally identifiable information of any
                        sidewalk vendor or any operator or EMPLOYEE of a COMPACT
                        MOBILE FOOD OPERATION in the jurisdiction without a
                        subpoena or judicial warrant. This section does not prohibit an
                        ENFORCEMENT AGENCY from challenging the validity of a
                        subpoena or judicial warrant in a federal district court.

                  (2) An ENFORCEMENT AGENCY and its personnel shall not
                        disclose or provide in writing, verbally, or in any other manner,
                        personally identifiable information of any sidewalk vendor or any
                        operator or EMPLOYEE of a COMPACT MOBILE FOOD
                        OPERATION obtained pursuant to this part that is requested,
                        except pursuant to a subpoena or a valid judicial warrant.

      (h) For purposes of this section, "personally identifiable information" means
            an individual''s name, business name, home address, business address,
            birthdate, telephone number, business location, California driver''s license
            or identification number, individual taxpayer identification number,
            municipal identification number, government-issued identification
            number, consular identification, social media identifiers, employer
            identification number, business license number, seller''s permit number,
            social security number, vending registration certificate or license number,
            known place of work, income and tax information, and any other
            information that would identify the individual.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114381.1', 'Permit requirements for an organizer', 'In addition to the PERMIT issued to each FOOD FACILITY participating
in a COMMUNITY EVENT or SWAP MEET, a PERMIT shall be obtained by the
PERSON or organization responsible for facilities that are shared by two or more
FOOD FACILITIES.

      (a) The PERMIT application and site plan shall be submitted to the
            ENFORCEMENT AGENCY at least two weeks prior to operation of any
            FOOD FACILITY.
            The site plan shall show the proposed locations of the FOOD
            FACILITIES, restrooms, REFUSE containers, POTABLE WATER supply
            faucets, waste water disposal facilities, and all shared WAREWASHING
            and handwashing facilities.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114381.2', 'Permit requirements for temporary food facilities', 'A PERMIT application shall be submitted to the ENFORCEMENT
AGENCY by each TEMPORARY FOOD FACILITY operator that includes all of the
following:

      (a) A site plan that indicates the proposed layout of EQUIPMENT, FOOD

                                               199
            PREPARATION tables, FOOD storage, WAREWASHING, and
            handwashing
      (b) Details of the materials and methods used to construct the TEMPORARY
            FOOD FACILITY.
      (c) All FOOD products that will be handled and dispensed.
      (d) The proposed procedures and methods of FOOD PREPARATION and
            handling.
      (e) Procedures, methods, and schedules for cleaning UTENSILs,
            EQUIPMENT, and structures, and for the disposal of REFUSE.
      (f) How FOOD will be transported to and from a PERMANENT FOOD
            FACILITY or other APPROVED FOOD FACILITY and the TEMPORARY
            FOOD FACILITY, and steps taken to prevent contamination of FOODs.
      (g) How POTENTIALLY HAZARDOUS FOODs will be maintained at or
            below 41�F or at or above 135�F.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114381.3', 'Permit requirements for compact mobile food operations', '(a) A PERMIT application for a COMPACT MOBILE FOOD OPERATION
            shall comply with all of the following requirements:
                  (1) An ENFORCEMENT AGENCY shall accept a California driver''s
                        license or identification number, an individual taxpayer
                        identification number, or a municipal identification number in lieu
                        of a social security number if the ENFORCEMENT AGENCY
                        otherwise requires a social security number for a permit, and the
                        number collected shall not be available to the public for
                        inspection, shall be confidential, and shall not be disclosed
                        except as required to administer the PERMIT or licensure
                        program or to comply with a state law or state or federal court
                        order.
                  (2) The ENFORCEMENT AGENCY shall not inquire into or collect
                        information about an individual''s immigration or citizenship
                        status or place of birth.
                  (3)
                        (A) The ENFORCEMENT AGENCY shall not inquire into or
                             collect information or documentation regarding an
                             individual''s criminal history, and shall not require an
                             applicant to submit fingerprints, complete a LiveScan
                             fingerprinting, or submit to a background check as part of
                             an application for a PERMIT.
                        (B) Notwithstanding any other law, including Division 10
                              (commencing with Section 7920.000) of Title 1 of the
                              Government Code, an ENFORCEMENT AGENCY that
                              inquired into or collected information or documentation
                              regarding an individual''s place of birth or criminal history,
                              required an applicant to submit fingerprints or complete a
                              LiveScan fingerprinting, or performed a background check

                                               200
                              before January 1, 2026, shall destroy those records on or
                              before March 1, 2026, unless those records are expressly
                              required by law to be preserved.

     (b) Any personally identifiable information collected by an ENFORCEMENT
         AGENCY pursuant to this section shall be exempt from disclosure under
         the California Public Records Act (Division 10 (commencing with Section
         7920.000) of Title 1 of the Government Code).

    (c) For purposes of this section, "personally identifiable information" means an
         individual''s name, business name, home address, business address,
         birthdate, telephone number, business location, California driver''s license
         or identification number, individual taxpayer identification number,
         municipal identification number, government-issued identification number,
         consular identification, social media identifiers, employer identification
         number, business license number, seller''s permit number, social security
         number, vending registration certificate or license number, known place of
         work, income and tax information, and any other information that would
         identify the individual.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114387', 'Permit required; penalties', 'Any PERSON who operates a FOOD FACILITY shall obtain all necessary
PERMITs to conduct business, including, but not limited to, a PERMIT issued by
the ENFORCEMENT AGENCY. In addition to the penalties under Article 2
(commencing with Section 114390), violators who operate without the necessary
PERMITs shall be subject to closure of the FOOD FACILITY and a penalty not to
exceed three times the cost of the PERMIT.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "1", "article_title": "Plan Review and Permits"}'::jsonb),
  ('CalCode', '114390', 'Enforcement responsibility; evidence; inspection report', '(a) ENFORCEMENT OFFICERs shall enforce this part and all regulations
            adopted pursuant to this part.

      (b)
                  (1) For purposes of enforcement, any authorized ENFORCEMENT
                        OFFICER may, during the facility''s hours of operation and other
                        reasonable times, enter, inspect, issue citations to, and secure
                        any sample, photographs, or other evidence from a FOOD
                        FACILITY, COTTAGE FOOD OPERATION, or any facility
                        suspected of being a FOOD FACILITY or COTTAGE FOOD
                        OPERATION, or a vehicle transporting FOOD to or from a
                        RETAIL FOOD FACILITY, when the vehicle is stationary at an
                        agricultural inspection station, a border crossing, or at any
                        FOOD FACILITY under the jurisdiction of the ENFORCEMENT
                        AGENCY, or upon the request of an incident commander.

                                               201
                  (2) If a FOOD FACILITY is operating under an HACCP PLAN, the
                        ENFORCEMENT OFFICER may, for the purpose of determining
                        compliance with the plan, secure as evidence any documents,
                        or copies of documents, relating to the facility''s adherence to the
                        HACCP PLAN. Inspection may, for the purpose of determining
                        compliance with this part, include any record, file, paper,
                        process, HACCP PLAN, invoice, or receipt bearing on whether
                        FOOD, EQUIPMENT, or UTENSILs are in violation of this part.

                  (3) The ENFORCEMENT OFFICER may, for the purpose of
                        determining compliance with the gross annual sales
                        requirements for operating a MICROENTERPRISE HOME
                        KITCHEN OPERATION or a COTTAGE FOOD OPERATION,
                        require those operations to provide copies of documents related
                        to determining gross annual sales.

      (c) Notwithstanding subdivision (a), an EMPLOYEE may refuse entry to an
            ENFORCEMENT OFFICER who is unable to present official identification
            showing the ENFORCEMENT OFFICER''s picture and ENFORCEMENT
            AGENCY name. In the absence of the identification card, a business card
            showing the ENFORCEMENT AGENCY''s name plus a picture
            identification card such as a driver''s license shall meet this requirement.

      (d) It is a violation of this part for any PERSON to refuse to PERMIT entry or
            inspection, the taking of samples or other evidence, access to copy any
            record as authorized by this part, to conceal any samples or evidence,
            withhold evidence concerning them, or interfere with the performance of
            the duties of an ENFORCEMENT OFFICER, including making verbal or
            physical threats or sexual or discriminatory harassment.

      (e) A written report of the inspection shall be made and a copy shall be
            supplied or mailed to the owner, manager, or operator of the FOOD
            FACILITY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "2", "article_title": "Enforcement"}'::jsonb),
  ('CalCode', '114393', 'Impoundment', '(a) Based upon inspection findings or other evidence, an ENFORCEMENT
            OFFICER may IMPOUND FOOD, EQUIPMENT, or UTENSILs that are
            found to be, or suspected of being, unsanitary or in such disrepair that
            FOOD, EQUIPMENT, or UTENSILs may become contaminated or
            ADULTERATED, and inspect, IMPOUND, or inspect and IMPOUND any
            UTENSIL that is suspected of releasing lead or cadmium in violation of
            Section 108860. The ENFORCEMENT OFFICER may attach a tag to the
            FOOD, EQUIPMENT, or UTENSILs that shall be removed only by the
            ENFORCEMENT OFFICER following verification that the condition has
            been corrected.

      (b) No FOOD, EQUIPMENT, or UTENSILs IMPOUNDed pursuant to
            subdivision (a) shall be used unless the IMPOUNDment has been
            released.

      (c) Within 30 days, the ENFORCEMENT AGENCY that has IMPOUNDed
            the FOOD, EQUIPMENT, or UTENSILs pursuant to subdivision (a) shall

                                               202
            commence proceedings to release the IMPOUNDed materials or to seek
            administrative or legal remedy for its disposition.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "2", "article_title": "Enforcement"}'::jsonb),
  ('CalCode', '114395', 'Violation; misdemeanor; punishment', 'Except as otherwise provided in this part, any PERSON who violates any
provision of this part or regulation adopted pursuant to this part is guilty of a
misdemeanor. Each offense shall be punished by a fine of not less than twenty-
five dollars ($25) or more than one thousand dollars ($1,000) or by imprisonment
in the county jail for a term not exceeding six months, or by both fine and
imprisonment.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "2", "article_title": "Enforcement"}'::jsonb),
  ('CalCode', '114397', 'Owner, manager, or operator responsibility', 'The owner, manager, or operator of any FOOD FACILITY is responsible
for any violation by an EMPLOYEE of any provision of this part or any regulation
adopted pursuant to this part. Each day the violation occurs shall be a separate
and distinct offense.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "2", "article_title": "Enforcement"}'::jsonb),
  ('CalCode', '114399', 'Facilities held in common', 'A violation of any provision of this part or regulation adopted pursuant to
this part relating to facilities held in common or shared by more than one FOOD
FACILITY shall be deemed a violation for which the owner, manager, or operator
of each FOOD FACILITY is responsible.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "2", "article_title": "Enforcement"}'::jsonb),
  ('CalCode', '114405', 'Permit suspension or revocation', '(a) A PERMIT may be suspended or revoked by a local ENFORCEMENT
            OFFICER for a violation of this part. Any FOOD FACILITY or COTTAGE
            FOOD OPERATION for which the PERMIT has been suspended shall
            close and remain closed until the PERMIT has been reinstated. Any
            FOOD FACILITY or COTTAGE FOOD OPERATION for which the
            PERMIT has been revoked shall close and remain closed until a new
            PERMIT has been issued.

      (b) Whenever a local ENFORCEMENT OFFICER finds that a FOOD
            FACILITY or COTTAGE FOOD OPERATION is not in compliance with
            the requirements of this part, a written notice to comply shall be issued to
            the PERMIT HOLDER. If the PERMIT HOLDER fails to comply, the local
            ENFORCEMENT OFFICER shall issue to the PERMIT HOLDER a notice
            setting forth the acts or omissions with which the PERMIT HOLDER is
            charged, and informing him or her of a right to a hearing, if requested, to
            show cause why the PERMIT should not be suspended or revoked. A
            written request for a hearing shall be made by the PERMIT HOLDER

                                               203
            within 15 calendar days after receipt of the notice. A failure to request a
            hearing within 15 calendar days after receipt of the notice shall be
            deemed a waiver of the right to a hearing. When circumstances warrant,
            the HEARING OFFICER may order a hearing at any reasonable time
            within this 15-day period to expedite the PERMIT suspension or
            revocation process.
      (c) The hearing shall be held within 15 calendar days of the receipt of a
            request for a hearing. Upon written request of the PERMIT HOLDER, the
            HEARING OFFICER may postpone any hearing date, if circumstances
            warrant the action.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "3", "article_title": "Permit Suspension or Revocation"}'::jsonb),
  ('CalCode', '114407', 'Notice of decision', 'The HEARING OFFICER shall issue a written notice of decision to the
PERMIT HOLDER within five working days following the hearing. In the event of a
suspension or revocation, the notice shall specify the acts or omissions with which
the PERMIT HOLDER is charged, and shall state the terms of the suspension or
that the PERMIT has been revoked.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "3", "article_title": "Permit Suspension or Revocation"}'::jsonb),
  ('CalCode', '114409', 'Immediate closure', '(a) If any IMMINENT HEALTH HAZARD is found, unless the HAZARD is
            immediately corrected, an ENFORCEMENT OFFICER may temporarily
            suspend the PERMIT and order the FOOD FACILITY or COTTAGE
            FOOD OPERATION immediately closed.

      (b) Whenever a PERMIT is suspended as the result of an IMMINENT
            HEALTH HAZARD, the ENFORCEMENT OFFICER shall issue to the
            PERMIT HOLDER a notice setting forth the acts or omissions with which
            the PERMIT HOLDER is charged, specifying the pertinent code section,
            and informing the PERMIT HOLDER of the right to a hearing.

      (c) At any time within 15 calendar days after service of a notice pursuant to
            subdivision (b), the PERMIT HOLDER may request in writing a hearing
            before a HEARING OFFICER to show cause why the PERMIT
            suspension is not warranted. The hearing shall be held within 15 calendar
            days of the receipt of a request for a hearing. A failure to request a hearing
            within 15 calendar days shall be deemed a waiver of the right to a hearing.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "3", "article_title": "Permit Suspension or Revocation"}'::jsonb),
  ('CalCode', '114411', 'Serious or repeated violations, interference', 'The ENFORCEMENT AGENCY may, after providing opportunity for a
hearing, modify, suspend, or revoke a PERMIT for serious or repeated violations
of any requirement of this part or for interference in the performance of the duty of
the ENFORCEMENT OFFICER.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "3", "article_title": "Permit Suspension or Revocation"}'::jsonb),
  ('CalCode', '114413', 'Permit reinstatement or reissuance', 'A PERMIT may be reinstated or a new PERMIT issued if the

                                               204
ENFORCEMENT AGENCY determines that the conditions that prompted the
suspension or revocation no longer exist.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "3", "article_title": "Permit Suspension or Revocation"}'::jsonb),
  ('CalCode', '114417', 'Issuance of variances', 'The DEPARTMENT may issue a VARIANCE for only the provisions set
forth in Section 113936, if in the opinion of the DEPARTMENT, the alternative
practice or procedure is equivalent to the respective requirements of this part and
the alternative practice or procedure does not result in a health HAZARD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.1', 'Applications for variances', '(a) Within 180 days after the effective date of this part, the DEPARTMENT
            shall develop the form of application that an applicant for a VARIANCE
            must submit. The DEPARTMENT may amend the form as it deems
            appropriate. The application shall contain, at a minimum, the following
            information:
                  (1) A detailed description of the requested VARIANCE, including
                        citation to the relevant subdivisions specified in Section 113936.
                  (2) An analysis of the science-based rationale upon which the
                        proposed alternate practice or procedure is based, to include, if
                        and as appropriate, microbial challenge and process validation
                        studies demonstrating how potential health HAZARDs dealt with
                        in those subdivisions that are relevant to the requested
                        VARIANCE will be addressed.
                  (3) A description of the specific procedures, processes, monitoring
                        steps, and other relevant protocols that will be implemented
                        pursuant to the VARIANCE to address potential health
                        HAZARDs dealt with in those subdivisions specified in Section
                        113936 that are relevant to the requested VARIANCE.
                  (4) An HACCP PLAN, if required pursuant to Section 114419, that
                        includes all applicable information relevant to the requested
                        VARIANCE.

      (b) An application for a VARIANCE shall be submitted to the DEPARTMENT,
            and must be accompanied at the time of submission by the fees specified
            in subdivision (c).

      (c) Each application for a VARIANCE shall be accompanied at the time of
            submission by payment of fees sufficient to pay the necessary costs of
            the DEPARTMENT as specified in Section 113717. Any overpayment by
            the applicant in excess of the recovery rate and other costs incurred shall
            be repaid to the applicant within 30 calendar days after final action is
            taken by the DEPARTMENT on the application.

                                               205', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.2', 'Issuance or denial of variances by the department', '(a) Upon receipt of an application for a VARIANCE, the DEPARTMENT shall
            determine whether the application is substantially complete and in
            compliance with Section 114417.1. Within 45 calendar days after
            submission of a complete application that complies with Section
            114417.1, the DEPARTMENT shall determine whether the alternate
            practice or procedure described in the application is satisfactory and at
            least the equivalent of the requirements of this part relating to preventing
            a health HAZARD.

      (b) In the event that the DEPARTMENT grants the VARIANCE, it shall issue
            to the applicant a VARIANCE letter that shall include, but not be limited
            to, the information specified in Section 114417.3.

      (c) The DEPARTMENT shall transmit a copy of its VARIANCE letter to all
            local enforcement agencies.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.3', 'Contents of variance letter', 'Each VARIANCE letter shall include, have attached to it, or reference
each of the following:

      (a) The information specified in Section 114417.1. That information may be
            presented verbatim, in summary form, or by means of attachment.

      (b) Detailed findings by the DEPARTMENT as to the nature and extent of the
            potential HAZARDs, if any, that might be implicated with respect to the
            requirements specified in this part, and the manner in which the alternate
            practice or procedure specified in the VARIANCE will address those
            HAZARDs.

      (c) The specifics of any operating restrictions or requirements upon which
            the granting of the VARIANCE is conditioned.

      (d) If appropriate, the particular events, locations, and operations for which
            the VARIANCE is granted.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.4', 'Effect of variance letter', 'A VARIANCE letter shall be valid solely with respect to those FOOD
FACILITIES, events, locations, and operations expressly set forth and only on the
specific terms and conditions upon which the VARIANCE is granted. A VARIANCE
granted by the DEPARTMENT shall be binding on every local ENFORCEMENT
AGENCY.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.5', 'Maintenance of variance letter', 'The PERMIT HOLDER shall retain a copy of the VARIANCE letter on file
at the FOOD FACILITY at all times and shall make it available for inspection by
the ENFORCEMENT OFFICER.

                                               206', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.6', 'Compliance with terms and conditions of variance letter', 'If the DEPARTMENT grants a VARIANCE, or if an HACCP PLAN is
required pursuant to Section 114419, the PERMIT HOLDER shall do both of the
following:

      (a) Comply with the HACCP PLAN and procedures that are submitted as
            specified in Section 114419.1 and 114419.2 and APPROVED as a
            condition for the granting of the VARIANCE.

      (b) Maintain and provide to the ENFORCEMENT AGENCY, upon request,
            records specified under a HACCP PLAN, or otherwise pursuant to the
            VARIANCE letter, that demonstrate that the following are routinely
            employed:
                  (1) Procedures for monitoring CRITICAL CONTROL POINTs.
                  (2) Monitoring of the CRITICAL CONTROL POINTs.
                  (3) Verification of the effectiveness of an operation or process.
                  (4) Necessary corrective actions if there is a failure at a CRITICAL
                        CONTROL POINT.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114417.7', 'Suspension or revocation of variance', '(a) The DEPARTMENT may suspend or revoke a VARIANCE if either of the
            following occurs:
                  (1) The DEPARTMENT determines that the VARIANCE poses a
                        HAZARD due to changes in scientific knowledge or the nature
                        and extent of any HAZARD that might result.
                  (2) There is a finding that the FOOD FACILITY is not complying with
                        specific terms and conditions pursuant to which the VARIANCE
                        was granted.

      (b) The DEPARTMENT may suspend or revoke a VARIANCE upon the
            grounds specified in this section only after giving the PERMIT HOLDER
            written notice of the proposed suspension or revocation, which shall
            include the specific reasons why the VARIANCE is proposed to be
            suspended or revoked. The PERMIT HOLDER shall be given an
            opportunity to be heard, in PERSON, in writing, or through a
            representative, at least 24 hours before the VARIANCE can be
            suspended or revoked.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "4", "article_title": "Variance"}'::jsonb),
  ('CalCode', '114419', 'When a HACCP plan is required', '(a) FOOD FACILITIES may engage in any of the following activities only
            pursuant to an HACCP PLAN as specified in Section 114419.1:
                  (1) Smoking FOOD as a method of FOOD preservation rather than
                        as a method of flavor enhancement.

                                               207
                  (2) Curing FOOD.
                  (3) Using FOOD ADDITIVEs or adding components such as

                        vinegar as a method of FOOD preservation rather than as a
                        method of flavor enhancement, or to render a FOOD so that it is
                        not POTENTIALLY HAZARDOUS.
                  (4) Operating a MOLLUSCAN SHELLFISH life support system
                        display tank used to store and display SHELLFISH that are
                        offered for human consumption.
                  (5) Custom processing animals that are for personal use as FOOD
                        and not for sale or service in a FOOD FACILITY.
                  (6) Preparing FOOD by another method that is determined by the
                        ENFORCEMENT AGENCY to require an HACCP PLAN.
      (b) FOOD FACILITIES may engage in the following only pursuant to an
            HACCP PLAN that has been APPROVED by the DEPARTMENT:
                  (1) Using acidification or water activity to prevent the growth of
                        Clostridium botulinum.
                  (2) Packaging POTENTIALLY HAZARDOUS FOOD using a
                        REDUCED-OXYGEN PACKAGING method as specified in
                        Section 114057.1, except if the FOOD FACILITY uses a
                        REDUCED-OXYGEN PACKAGING method to package
                        hazardous FOOD that always complies with the following
                        standards with respect to packaging the hazardous FOOD:
                        (A) The FOOD is labeled with the production time and date.
                        (B) The FOOD is held at 41 degrees Fahrenheit or lower during

                              refrigerated storage.
                        (C) The FOOD is removed from its package in the FOOD

                              FACILITY within 48 hours after packaging.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114419.1', 'Contents of a HACCP plan', 'For a FOOD FACILITY that is required under Section 114419 to have an
HACCP PLAN, the plan and specifications shall indicate all of the following:

      (a) A flow diagram of the specific FOOD for which the HACCP PLAN is
            requested, identifying CRITICAL CONTROL POINTs and providing
            information on the following:
                  (1) Ingredients, materials, and EQUIPMENT used in the
                        preparation of that FOOD.
                  (2) Formulations or recipes that delineate methods and procedural
                        control measures that address the FOOD safety concerns
                        involved.

     (b) A FOOD EMPLOYEE and supervisory training plan that addresses the
           FOOD safety issues of concern.

     (c) A statement of standard operating procedures for the plan under
           consideration including clearly identifying the following:
                  (1) Each CRITICAL CONTROL POINT.
                  (2) The CRITICAL LIMITs for each CRITICAL CONTROL POINT.
                  (3) The method and frequency for monitoring and controlling each

                                               208
                        CRITICAL CONTROL POINT by the FOOD EMPLOYEE
                        designated by the PERSON IN CHARGE.
                  (4) The method and frequency for the PERSON IN CHARGE to
                        routinely verify that the FOOD EMPLOYEE is following standard
                        operating procedures and monitoring CRITICAL CONTROL
                        POINTs.
                  (5) Action to be taken by the PERSON IN CHARGE if the CRITICAL
                        LIMITs for each CRITICAL CONTROL POINT are not met.
                  (6) Records to be maintained by the PERSON IN CHARGE to
                        demonstrate that the HACCP PLAN is properly operated and
                        managed.
      (d) Additional scientific data or other information, as required by the
            DEPARTMENT, supporting the determination that FOOD safety is not
            compromised by the proposal.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114419.2', 'HACCP plan training, verification, and equipment', '(a) Applicable HACCP training shall be provided and documented for FOOD
            EMPLOYEEs who work in the preparation of FOOD for which an HACCP
            PLAN has been implemented. Training given to FOOD EMPLOYEEs
            shall be documented as to date, trainer, and subject.

      (b) Verification of CRITICAL LIMITs specified in an HACCP PLAN shall be
            conducted by a laboratory APPROVED by the DEPARTMENT prior to
            implementation of the HACCP PLAN. Documentation of laboratory
            verification shall be maintained with the HACCP PLAN for the duration of
            its implementation.

      (c) No verification of the effectiveness of a CRITICAL LIMIT shall be required
            if the CRITICAL LIMITs used in the HACCP PLAN do not differ from the
            CRITICAL LIMITs set forth in this part.

      (d) The PERSON operating a FOOD FACILITY pursuant to a HACCP PLAN
            shall designate at least one PERSON to be responsible for verification of
            the HACCP PLAN. Training for the designated PERSON shall include the
            seven principles of HACCP and the contents of the HACCP PLAN as
            described in Section 114419.1. HACCP training records of the
            designated PERSON shall be retained for the duration of employment, or
            a period of not less than two years, whichever is greater.

      (e) CRITICAL LIMIT monitoring EQUIPMENT shall be suitable for its
            intended purpose and shall be calibrated as specified by its manufacturer.
            The FOOD FACILITY shall maintain all calibration records for a period
            not less than two years.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114419.3', 'HACCP plan approval', '(a) Except as specified in Section 114419, nothing in this section shall be
            deemed to require the ENFORCEMENT AGENCY to review or approve
            an HACCP PLAN.

      (b) The ENFORCEMENT AGENCY shall collect fees sufficient only to cover

                                               209
            the costs for review, inspections, and any laboratory samples taken.
      (c) An HACCP PLAN may be disAPPROVED if it does not comply with

            HACCP principles.
      (d) The ENFORCEMENT AGENCY may suspend or revoke its approval of

            an HACCP PLAN without prior notice if the agency finds any of the
            following:

                  (1) The plan poses a public health risk due to changes in scientific
                        knowledge or the HAZARDs present.

                  (2) The FOOD FACILITY does not have the ability to follow its
                        HACCP PLAN.

                  (3) The FOOD FACILITY does not consistently follow its HACCP
                        PLAN.

      (e) Within 30 days of written notice of suspension or revocation of approval,
            the FOOD FACILITY may request a hearing to present information as to
            why the HACCP PLAN suspension or revocation should not have taken
            place or to submit HACCP PLAN changes.

      (f) The hearing shall be held within 15 working days of the receipt of a
            request for a hearing. Upon written request of the PERMIT HOLDER, the
            HEARING OFFICER may postpone any hearing date, if circumstances
            warrant that action.

      (g) The HEARING OFFICER shall issue a written notice of decision within
            five working days following the hearing. If the decision is to suspend or
            revoke approval, the reason for suspension or revocation shall be
            included in the written decision.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114421', 'Trade secrets', '(a) Each FOOD FACILITY that identifies a trade secret shall provide in
            writing to the ENFORCEMENT AGENCY the information they consider to
            be a trade secret.

      (b) The ENFORCEMENT AGENCY shall treat as confidential, to the extent
            allowed by LAW, information that meets the criteria specified in LAW for
            a trade secret and is contained on inspection report forms and in the plans
            and specifications submitted as specified under Section 114419.1.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114423', 'Microbial challenge studies', 'A microbial challenge study may be submitted to the ENFORCEMENT
AGENCY for review for purposes of verifying that a FOOD does not constitute a
POTENTIALLY HAZARDOUS FOOD.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "5", "article_title": "HACCP Exemptions"}'::jsonb),
  ('CalCode', '114425', 'Exemption for Chinese-style roast duck', 'Raw duck that otherwise would be readily perishable shall be exempt

                                               210
from Section 113996 for a period not to exceed two hours, if the duck will
subsequently be cooked at or above a temperature of 350�F for at least 60
minutes.

      (a) Whole Chinese-style roast duck shall be exempt from Section 113996 for
            a period not to exceed four hours after the duck is prepared, if the
            methods used to prepare the FOOD inhibit the growth of microorganisms
            that can cause FOOD infections or FOOD intoxications. Nothing in this
            section shall be construed to supersede any provisions of this part, except
            the provisions specified in this section.

      (b) For the purposes of this section, "Chinese-style roast duck" shall include,
            but not be limited to, Chinese-style barbecue duck, dry hung duck, and
            Peking duck. "Chinese-style roast duck" means duck which is prepared
            as follows:
                  (1) The abdominal cavity is cleaned.
                  (2) The duck is marinated.
                  (3) The cavity is closed prior to cooking.
                  (4) The duck is roasted at a temperature of 350�F or more for at
                        least 60 minutes.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "6", "article_title": "Exemptions"}'::jsonb),
  ('CalCode', '114427', 'Exemption from full enclosure, Mercado La Paloma', 'The Mercado La Paloma, located at 3655 South Grand Avenue in Los
Angeles, operated by Esperanza Community Housing Corporation, which is a
public market open only on one side that meets the following criteria, shall be
exempt from Section 114266:

      (a) All facilities inside the Mercado La Paloma have overhead protection that
            extends over all FOOD items.

      (b) All facilities inside the Mercado La Paloma are enclosed on at least two
            sides.

      (c) All facilities inside the Mercado La Paloma are under the constant and
            complete control of the operator.

      (d) During periods of inoperation, FOOD, UTENSILs, and related items shall
            be stored so as to be adequately protected at all times from
            contamination, exposure to the elements, ingress of VERMIN, and
            temperature abuse.

      (e) During all hours of operation, air curtains shall be in operation over all
            unclosed door openings to the outside to EXCLUDE flying pests.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "6", "article_title": "Exemptions"}'::jsonb),
  ('CalCode', '114429', 'Exemption from holding temperatures, Korean rice cakes', '(a) Notwithstanding Sections 113996 and 114343 and if permitted by federal
            LAW, a FOOD FACILITY may sell Korean rice cakes that have been at
            room temperature for no more than 24 hours.

      (b) At the end of the operating day, Korean rice cakes that have been at room
            temperature for no more than 24 hours shall be destroyed in a manner
            APPROVED by the ENFORCEMENT AGENCY.

      (c) For purposes of this section, a "Korean rice cake" is defined as a

                                               211
            confection that contains rice powder, salt, sugar, various edible seeds,
            oil, dried beans, nuts, dried fruits, and dried pumpkin. The ingredient shall
            not include any animal fats or any other products derived from animals.
      (d) All manufacturers of Korean rice cakes shall place a label on the Korean
            rice cake as prescribed by Section 111223.

114429.3 Exemption for holding temperatures, Vietnamese rice cakes

      (a) Notwithstanding Sections 113996 and 114343 and if permitted by
            federal law, a FOOD FACILITY may sell Vietnamese rice cakes that
            have been at no more than 70 degrees Fahrenheit for no more than 24
            hours.

      (b) Vietnamese rice cakes that have been at no more than 70 degrees
            Fahrenheit but have been stored for more than 24 hours shall be
            destroyed in a manner approved by the ENFORCEMENT AGENCY.

      (c) All Vietnamese rice cakes shall bear a label meeting the requirements of
            Section 111223.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "6", "article_title": "Exemptions"}'::jsonb),
  ('CalCode', '114429.5', 'Exemption for holding temperatures, Asian rice based noodles', '(a) Notwithstanding Sections 113996 and 114343, and if permitted by federal
            law, a FOOD FACILITY may sell Asian rice-based noodles that have
            been kept at room temperature for no more than four hours.

      (b) Asian rice-based noodles that have been kept at room temperature shall
            be consumed or cooked within four hours of the date and time labeled on
            the product. Asian rice-based noodles that have been kept at room
            temperature shall be segregated for destruction from other Asian rice-
            based noodles in a manner approved by the local ENFORCEMENT
            AGENCY after four hours of the date and time labeled on the product.

      (c) At the end of the operating day, Asian rice-based noodles that have been
            kept at room temperature for more than four hours shall be destroyed in
            a manner approved by the local ENFORCEMENT AGENCY.

      (d)
                  (1) For purposes of this section, an "Asian rice-based noodle" means
                        a rice-based pasta that contains rice powder, water, wheat
                        starch, vegetable cooking oil, and optional ingredients to modify
                        the pH or water activity, or to provide a preservative effect. The
                        ingredients shall not include any animal fats or any other
                        products derived from animals. An Asian rice-based noodle is
                        prepared by using a traditional method that includes cooking by
                        steaming at not less than 130 degrees Fahrenheit, for not less
                        than four minutes.
                   (2) If the Asian rice-based noodles maintain a pH of not more than
                        4.6, as measured at a temperature of 76 degrees Fahrenheit, a
                        water activity of 0.85 or below, or have been determined by the
                        department to be a nonPOTENTIALLY HAZARDOUS FOOD
                        based on formulation and supporting laboratory documentation

                                               212
                        submitted to the department by the manufacturer, the
                        restrictions provided in subdivisions (a) to (c), inclusive, shall not
                        apply to the Asian rice-based noodles.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "6", "article_title": "Exemptions"}'::jsonb),
  ('CalCode', '114432', 'Food facility donations', '(a) A person, gleaner, or FOOD FACILITY may donate food to a food bank
            or to any other NONPROFIT CHARITABLE ORGANIZATION for
            distribution to persons free of charge. Food facilities may donate food
            directly to end recipients for consumption.

      (b) For purposes of this section, "person" has the same meaning as defined
            in Section 1714.25 of the Civil Code.

      (c) For purposes of this section, "gleaner" has the same meaning as defined
            in Section 1714.25 of the Civil Code.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "7", "article_title": "Food facility food donations"}'::jsonb),
  ('CalCode', '114433', 'Criminal liability', 'A person, GLEANER, or FOOD FACILITY that donates FOOD as
permitted by Section 114432 shall not be subject to civil or criminal liability or
penalty for violation of any LAWs, regulations, or ordinances regulating the labeling
or packaging of the donated product or, with respect to any other LAWs,
regulations, or ordinances, for a violation occurring after the time of the donation.
The donation of nonperishable FOOD that is fit for human consumption but that
has exceeded the labeled shelf life date recommended by the manufacturer is
protected under the California Good Samaritan Food Donation Act. The donation
of perishable FOOD that is fit for human consumption but that has exceeded the
labeled shelf life date recommended by the manufacturer is protected under the
California Good Samaritan Food Donation Act if the person that distributes the
FOOD to the end recipient makes a good faith evaluation that the FOOD to be
donated is wholesome.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "7", "article_title": "Food facility food donations"}'::jsonb),
  ('CalCode', '114434', 'Immunity', 'The immunities provided in Section 114433 and by Section 1714.25 of
the Civil Code, the California Good Samaritan Food Donation Act, are in addition
to any other immunities provided by LAW, including those provided by Chapter 5
(commencing with Section 58501) of Part 1 of Division 21 of the Food and
Agricultural Code.', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "7", "article_title": "Food facility food donations"}'::jsonb),
  ('CalCode', '114435', 'Food Recovery Promotion', 'In implementing this article, ENFORCEMENT OFFICERs shall promote
the recovery of FOOD fit for human consumption during their normal, routine

                                               213
inspections. Promotion shall include, but not be limited to, newsletters, bulletins,
and handouts that inform RETAIL FOOD FACILITY operators about the
protections from civil and criminal liability when donating FOOD.

Residential Care Facilities for the Elderly', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "7", "article_title": "Food facility food donations"}'::jsonb),
  ('CalCode', '114437', 'Delegation to State Department of Social Services', 'If and when a specific appropriation is made available, the State
Department of Social Services shall develop new regulations regarding FOOD
PREPARATION provisions for child day care facilities, community care facilities,
and residential care facilities for the elderly that would carry out the intent of this
part to ensure the health and safety of individuals and that would not adversely
affect those facilities that are safely operated. In developing proposed FOOD
PREPARATION provisions for child day care facilities, the State Department of
Social Services shall consult with the DEPARTMENT and the State Department of
Education.

Index

A
Acceptable market name, definition, 113729.5
Acidification

            HACCP requirement, 114419.b.1
Acute gastrointestinal illness, definition, 113733
Additive

            definition, 113729
            boiler water, criteria, 114189.1
            color, restrictions, 113998
            food or color additives, 114087
Adulterated, definition, 113732
Air drying, utensils, 114105
Air gap, 114193, 114193.1
Alcohol in candy, consumer advisory, 114093.1
Allergens, see Major food allergen
Animals in facility
            custom processing for personal use, 114419
            farm stands, 114375.d
            HACCP requirement, 114419.a.5
            handling, restrictions, 114259.4, 114259.5
            outdoor dining areas, 113709, 114259.5.d
ANSI accreditation requirement, 114130
Approved, definition, 113734.

                                               214
Approved source, definition, 113735
            requirement, 114021
            temporary food facility, 114339

Asian rice noodles, exemption, 114429.5
Authority to establish local requirements, 113709
Aw, definition, 113737

            HACCP requirement, 114419.b.1
            potentially hazardous food, 113871.c.1

B
Baby food, 114094.5
Backflow prevention methods, 114193.1
Back siphonage prevention, 114193
Bait fish, storage, 114259.5.e
Barbecues see Open air barbecues
Bare hand contact, non-prepackaged food, 113961
Bed and breakfast, 113893
Beer tasting, 113789, 114289
Beverages

            definition, 113739
            dispensing, 114065
            temporary food facility, 114345
            tubing, 114167
Buffet, see Salad bar
Bulk food labeling
            self-service, 114089.c
            working containers, 114051

C
CFR � Code of federal regulations

            definition, 113744
California Department of Health Services cost recovery, 113717
Can openers, 114139
Catering operation

            definition, 113739.1
            operation, 114328
            host facility, 114328.1
Ceilings/ walls, see Walls and ceilings
Certified farmers'' market
            definition, 113742
            applicable requirements, 114370
            facility requirements, 114371
            food sampling, 114371.b
            live animals, 114371.d
            raw shell eggs, 114373
            smoking, 114371.f
            toilet and handwashing facilities, 114371.c

                                               215
Certified Mobile Farmers'' Market, definition, 113743
Charitable feeding operation, see Limited service charitable feeding operation
Charitable, nonprofit organization

            definition, 113841
            delegation to State Department of Social Services, 114437
            temporary food facility, see Nonprofit charitable temporary food facility
Children''s Meals, 114379
            alternative beverage, 114379.30
            definition, 114379.10
            default beverage, 114379.20
            legislative intent, 114379.60
            variation; infraction; fine, 114379.50
Chinese-style roast duck, exemption, 114425
Chlorine sanitization, 114099.6.c.1, 114099.7.b.1
Cleaning & sanitizing of equipment and utensils, see Equipment and utensils
Cleanable in place (CIP), equipment, 114130.5
Cleaning frequency, equipment, 114117
Clothing, employee, 113971
Cold holding, see Hot and cold holding
Cold water, definition, 113747.1
Commingle, definition, 113748
Comminuted, definition, 113750
Commissary
            definition, 113751
            mobile food facility at a community event, 114295.b
            mobile food facility requirement, 114295.a
            mobile food facility storage requirement, 114295.c
            mobile support units, 114295.d
Community event
            definition, 113755
            permit requirements for an organizer, 114381.1
Compact Mobile Food Operation, 114368
            applicable requirements, 114368
            definition, 113831.c
            cottage food, 114368.3
            enforcement, 114368.8
            exemptions, 114368.6, 114368.7
            handwashing, 114368.4
            limited food prep, 114368.2
            microenterprise home kitchen operation, 114368.3
            mobile support unit, 114368.3
            permit requirements, 114381.3
            plan review, 114368.5
            warewashing, 114368.4
Compliance with applicable codes, 113715
Compressed gas cylinders, see Pressurized cylinders
Condiment

                                               216
            definition, 113756
            protection, 114077
Consumer, definition, 113757
Consumer access, 113984.1
            restrooms, 114276.2
Consumer advisory, 114093
Consumer information
            bakery products, labeling, 114089.1
            confectionary containing alcohol, 114093.1
            consumer advisory, 114093
            highly susceptible population, 114091
            honestly presented, 114087
            labeling, 114089
            major food allergens, 114093.5
Contamination, see Protection from contamination
Control point, definition, 113759
Cooking
            immediate service, 114014
            microwave, 114008
            plant foods, 114010
            raw animal products, 114004
Cooling, 114002, 114002.1
            equipment, capacity, 114153
Copper as food contact surface, use limitation, 114133
Cost recovery, 114289.5
Cottage food operation
            cottage food product list, 114365.5
            definition, 113758
            operational requirements, 114365.2
            registration and permitting, 114365
            training, 114365.6
Cottage food product, 114088
Community food producer,
            definition, 113752
            requirements, 114376
Critical control point, definition, 113760
Critical limit, definition, 113761
Curing food, HACCP requirement, 114419.a.2
Cutting surfaces maintenance and operation, 114177

D
Department, definition, 113763
Diligent preparation, 113998
Display of food, see Food display
Dollies, moveability, 114165
Donations

            criminal liability, 114433.

                                               217
            food facility donations, 114432
            immunity, 114434.
Doors
            Pass-thru, 114259.2
            restroom, 114276.c
Drainboards, 114103
Drains, floors, 114269
Drinking, employee, 113977
Drying agents, sanitization, 114109
Dumpster, see Refuse

E
Easily cleanable, definition, 113767
Easily movable, definition, 113768
Eating, employee, 113977
Egg

            definition, 113769
            holding temperatures, 113996
            receiving standards, 114041
            restrictions for highly susceptible populations, 114091
            substituting pasteurized for raw, 114012
            temporary food facility, storage/display, 114373
Electrical power requirements, 114182
Employee
            definition, 113770
            clothing, 113971
            eating, drinking or using tobacco, 113977
            knowledge, minimum standards, 113947

                See also Food safety certification
Employee Health

            employee with cold and flu symptoms, 113974
            employee with open or draining wounds, 113975
            exclusions and restrictions, 113950
            intent, 113949
            local health officer notification, 113949.1
            removal of exclusions and restrictions, 113950.5
            reportable illness / wounds, 113949.2
            responsibility of food safety certified person, 113949.2
            responsibility, employee, 113949.4
           responsibility, person in charge, 113949.5
Employee Storage Areas
            designated employee areas, 114256
            dressing rooms / lockers, 114256.1
            medicines, restriction / storage, 114256.2
            storage of first aid supplies, 114256.4
Enforcement
            enforcement agency, definition, 113773

                                               218
            enforcement officer, definition, 113774
            facilities held in common, 114399
            impoundment, 114393
            officer identification, 114390.c
            owner, manager, or operator responsibility, 114397
            permit suspension, see Permit suspension or revocation
            potable water standards, 114189.
            responsibility; evidence; inspection report, 114390
            violation; misdemeanor; punishment, 114395
Equipment and Utensils
            equipment, definition, 113777
            case lot handling, dollies/pallets/skids, 114165
            clean, operative, and in good repair, 114257
            cleaning for refilling of returned empty containers, 114121
            cleaning frequency, 114117
            cleaning maintenance tools, preventing contamination, 114123
            cleaning requirements for food-contact surfaces, nonfood-contact

                 surfaces, 114115
            cooling, heating, and holding capacities, 114153
            cutting surfaces, 114177
            design and construction, 114130.
            can openers, 114139
            characteristics, 114130.1
            copper as food contact surface, use limitation, 114133
            equipment cleanable in place (CIP), 114130.5
            food-contact surfaces, 114130.3
            nonfood-contact surfaces, 114130.4
            single-use articles characteristics, 114130.2
            sponges, use limitation, 114135
            V" threads, use limitation, 114137
            wood as food contact surface, use limitation, 114132
            equipment and Utensils, maintenance and operation, 114175
            fixed equipment, spacing or sealing, 114169
            food contact surface cleanliness, 114113
            indirect drainage, 114193
           lubrication of food-contact surfaces, 114141
            returnables, 114121
            sanitization, manual, 114099.6
            sanitization, mechanical, 114099.7
            storage of equipment and utensils

                 in use, between uses, 114119
                 prohibitions, 114179
                 protection from contamination, 114161
                 requirements, 114178
           water reservoir of fogging devices, requirements, 114180
Eviscerated fish display, 114063
Exclude, definition, 113778.

                                               219
Exclusion, see Employee health
Exemptions

            chinese-style roast duck, 114425
            full enclosure, Mercado La Paloma, 114427
            holding temperatures, Korean rice cakes, 114429
            holding temperatures, Asian rice based noodles, 114429.5
Exhaust, mechanical ventilation, 114149
Expiration date, see Use by date

F
FDA, definition, 113778.1
Fabric implement

            definition, 113778.4
            cleaning requirement, 114118
            construction, 114130.6
Farm stand
            definition, 113778.2
            requirements, 114375
Fingernails, 113968
Final cooking temperatures , raw animal products, 114004, 114008
Final cooking temperatures, fruits and vegetables, 114010
Fish
            definition, 113779
            approved source, 114027
            bait fish, storage, 114259.5.e
            cold and hot holding, 113996
            cooking temperatures, 114004
            eviscerated fish display, 114063
            shellfish, see Shellfish
            tanks/aquariums in food facility, 114259.5
Fisherman''s market
            applicable requirements, 114378
            application for permit, 114378.3
            definition, 113780
            fishermen''s market requirements, 114378.2
            sale of fish, 114378.1
Fixed equipment, spacing or sealing, 114169
Floors
            cleaning with dustless methods, 114268.1
            construction and material, 114268.a
            coving, 114268.b
            drains, installation requirement, 114269
            mats and duckboards, 114272
            temporary food facilities, 114347
            use of sawdust, wood shavings, peanut hulls, or similar

                materials, 114268.d
Fogging devices

                                               220
           requirements, 113980
            water reservoir cleaning, 114180.
Food
            definition, 113781
            see Protection from contamination
Food bank, definition, 113783
Food compartment, definition, 113784
Food-contact surface
            definition, 113786
            see Equipment and utensils

Food display
            condiments, protection, 114077
            consumer self-service, 114063
            in contact with water or ice, 114053
            outdoor, 114069
            requirements, 114060
            returned food, re-service of food, 114079
            self-service bulk beverage dispensing, 114065
            single-use articles, milk dispenser, 114073

Food employee, definition, 113788
Food facility, definition, 113789
Food facility inspection format, 113725

            inspection report availability, 113725.1
            reporting procedures, 113725.3
            uniform statewide food inspection standardization, 113725.2
Food from Approved Sources
            compliance, 114021
            fish, 114027
            game animals, 114031
            hermetically sealed container, 114023
            ice, 114025
            molluscan shellfish, 114029
            pasteurized egg and milk products, 114024
Food handler, definition, 113790
Food handler card, 113948
Food handler program, definition, 113794.1
Food preparation
            definition, 113791
            farm stands, 114375.a
Food preparation sinks
            requirements, 114163
Food recovery promotion 114435
Food safety certification
            approved and accredited exams, 113947.2
            food certification prohibition, 113947.4
            infraction, 113947.6

                                               221
            recognition of certificate, 113947.3
            requirements, 113947.1
            violations, 113947.5
Food safety program, definition, 113794
Food storage
            adequate space, 114047
            container labeling, 114051
            farm stands, 114375.f
            food in contact with water or ice, 114053
            prohibited areas, 114049
            returns/distressed merchandise, 114055
Food transportation, 113982, 113996.a
Formula, infant 114094.5
Fresh frozen, definition, 113794.3
Frozen food
            definition, 113794.4
            storage requirements, 114018
Full enclosure, exemption from, Mercado La Paloma, 114427
Fully enclosed facility, 113984, 114266

G
Game animal

            definition, 113795
            requirements, 114031
Garbage, see Refuse
Gardens, community, culinary, personal, school, 113752
Gleaner
            definition, 113796
            requirements, 114376
Gloves
            use, 113973
            double glove use, 113953.3
Grade A standards, definition, 113797
Grease trap/interceptor, 114201

H
HACCP

            definition, 113799
            HACCP plan, definition, 113801
            contents of a HACCP plan, 114419.1
            enforcement, securing documentation, 114390
            microbial challenge studies, 114423.
            plan approval, 114419.3
            reduced oxygen packaging, 114057.1
            trade secrets, 114421
            training, verification, and equipment, 114419.2
            when a HACCP plan is required, 114419

                                               222
Hair restraints, 113969
Handling kitchenware / tableware, 114081, 114083
Handwashing requirements and procedure

            alternate handwashing facilities at Temporary Food Facilities, 114358
            cleanliness of hands, 113952
            facilities for employees and patrons, 114276
            facilities, location for mobile food facilities, 114314
            facility maintenance and use, 113953.1
            frequency allowed, 113963
            hand sanitizers, 113953.4
            handling ready-to-eat foods, 113961
           maintenance tools cleaning, preventing contamination, 114123
            procedure, 113953.3
           signage, 113953.5
           sink requirements for mobile food facilities, 114311
           structural requirements for facilities, 113953
           supplies, 113953.2
           temporary food facility, 114358
Hazard, definition, 113803
Hearing officer, definition, 113804
Heating equipment capacity, 114153
Hermetically sealed container
            definition, 113805
            potentially hazardous food, 113871.c.4
            requirements, 114023
Highly susceptible population
            definition, 113806
            pasteurized foods, prohibited reservice and prohibited food, 114091
Holding Temperatures
            equipment capacities, 114153
            exemption from, Korean rice cakes, 114429
            hot and cold holding of PHFs, 113996
            hot holding for fruits and vegetables, 114010
            mobile food facilities, 114303.d
            temporary food Facilities, 114343
Honest presentation, food, 114087
Host facility
            definition, 113806.1
            catering operation, 114328
            operation, 114328.1
Hot dog, definition, 113807
Hot water, see Water heater
Hood ventilation system, 114149.2
Housing and Community Development Dept. Certification, 114294.c

I
Ice

                                               223
            as a coolant, 113990
            potable water, 114025
            temporary food facility, not used for consumption, 114355
Ice units
            separation from waste drains, 114171
Identification of shellfish, 114039.1-114039.5
Ill employees with cold or flu symptoms, 113974
Immediate service temperature requirement, 114014
Imminent health hazard, definition, 113810
Impound, definition, 113812
Impoundment, 114393
Infant formula, 114094.5
Injected, definition, 113814
Insect control devices, 114259.3.
Insecticides see Poisonous and toxic materials
Inspection upon receipt, 114035
Iodine sanitization, 114099.6.c.2, 114099.7.b.2

J
Janitorial facilities,

            curbed cleaning facility / janitorial sink, 114279
            drying mops, 114282
            storage area for cleaning equipment and supplies, 114281
Juice
            definition, 113815
            restrictions for highly susceptible populations, 114091

K
Kitchenware/tableware, handling, 114081, 114083
Korean rice cakes, exemption, 114429

L
Labeling

            bakery, 114089.1
            dating information visibility, 114090
            food containers, common name, 114051
            requirements, 114089
            menu, 114094
Latex glove, prohibition, 113973(g)
Law, definition, 113816
Legislative intent to preempt local standards, 113705
Licensed health care facilities, see Highly susceptible populations
Lighting
            light bulbs, protective shielding, 114252.1
            lighting requirements, 114252
Limited service charitable feeding operation, 114333
            cost recovery, 114332.2

                                               224
            definition, 113819
            intent, 114333.1
Limited food preparation
            definition, 113818
            restrictions, 113984.c
Limited square footage requirement, 114289
Linens
            definition, 113820
            clean linens, 114185.2
            fabric implements, see Fabric implements
            laundering specifications, 114185.3
            storage of linens, 114185.4, 114178
            storage prohibitions, 114179
            use limitation, 114185
            use of laundry facilities, 114185.5
            wiping cloths, use limitation, 114185.1
Liquid waste
            disposal system, 114197
            drainage, 114199
            grease trap/interceptor, 114201
Living or sleeping quarters, separation and use, 114285, 114286
Lubrication of food-contact surfaces, 114141

M
Maintenance and Operation of equipment, see Equipment and Utensils
Major food allergen

            definition, 113820.5
            food safety certification examination, 113947.2
            minimum standard of knowledge, 113947
            notice to consumer, 114093.5
Major violation, definition, 113821
Manual warewashing / sanitization, see Warewashing
Meat, definition, 113823
Menu change, definition, 113824
Menu labeling
            definition, 114094
            requirements, 114094
Microenterprise home kitchen operation
            definition, 113825
            discretion to authorize, 114367
            food delivery personnel, 114367.5
            internet food service intermediary, 114367.6
            permit requirement, 114367.2
            regulation, 114367.3, 114390
            residential zoning, 114367.4
            restricted food facility, 114367.1
Microwave cooking, 114008

                                               225
Milk
            dispenser, 114073
            grade A standard, 113797
            highly susceptible populations, 114091.b
            holding temperature, 113996

Minor violation, definition, 113827
Mobile food facility

            definition, 113831
            approval by enforcement agency, 114294
            cleaning and servicing, 114297
            commissary facility requirements, 114326, 114295.d
            compact mobile food operation, definition, 113831.c
            department of Housing and Community Development Certification,
            114294.c
            equipment construction requirements, 114301
            exterior and surrounding area to be sanitary, 114317
            food and utensils, protection from contamination, 114303
            food handling, 114305
            handwashing and warewashing facilities, location, 114314
            handwashing sink requirements, 114311
            height and width of occupied areas, 114321
            identification of owner, 114299
            location of compressors, 114322
            mobile food facilities that operate at community events, 114307
            mobile food facility exemptions, 114309
            operation from a commissary, 114295
            safety requirements, 114323
            single operating site

                        definition, 113831.b
                        requirements, 114306
            storage of non-food items, chemicals, food, utensils, 114319
            toilet and handwashing facilities, 114315
            warewashing sink requirements, 114313
            water heater requirements, 114325
Mobile support unit,
            definition, 113833.
            mobile support unit facility requirements, 114327, 114297.d
Mobile potable water and wastewater tanks
            non-permanent food facilities, hose, construction and identification,
            114215
            potable water and wastewater tanks, 114205.
            potable water and wastewater tanks, construction, 114207
            potable water and wastewater tanks, drainage, 114209
            potable water and wastewater tanks, protection from contamination,
            114211
            potable water and wastewater tanks, tank vent, protected, 114213
            potable water tanks, capacity, 114217

                                               226
            potable water tanks, enclosed system, 114219
            potable water tanks, filter, 114227
            potable water tanks, inlet and outlet, 114225
            potable water tanks, inlet requirements, 114231
            potable water tanks, inspection and cleaning port, 114221
            potable water tanks, protective cover or device, 114229
            potable water tanks, refilling and storage, 114239
            potable water tanks, system flushing and disinfection, 114233
            potable water tanks, tank, pump, and hoses dedication, 114238
            potable water tanks, using a pump and hoses, backflow prevention,
            114235
            potable water tanks, "V" type threads, use limitation, 114223
            wastewater tanks, capacity and drainage, 114240
            wastewater tanks, flushing, 114242
            wastewater tanks, waste removal procedure, 114241
Molluscan shellfish
            definition, 113835
            approved source, 114029
            HACCP requirement, 114419.a.4
            life support system display tank,, 114039.5
Monitoring thermometer, 114157
Mop sink, see Janitorial facilities
Multiservice utensil, definition, 113837 see Equipment and utensils for more
            information

N
Nonpermanent food facility, definition, 113839
Nonprofit charitable organization, definition, 113841
Nonprofit Charitable Temporary Food Facilities

            definition, 113842
            additional requirements, 114332.4
            authority to inspect and require permits, 114332.7
            frequency and duration of operations, 114332.1
            handwashing, utensil washing, liquid waste, toilet, food contact surface
            requirement, 114332.2
            open-air barbecue, 114332.5
            operational requirements, 114332.3
            smoking, 114332.3.f
Nonfood-contact surfaces
            characterstics, 114130.4
            cleaning requirement, 114115, see Walls and ceiling for more
            information
Nutritional information requirements, 114094

O
Open-air barbecue

            definition, 113843

                                               227
            mobile food facilities at community events, 114307.c
            nonprofit charitable temporary food facilities, 114332.5
            outdoor wood-burning oven, 114143
            temporary food facilities, 114341.b,c
Out-door food display, 114069
Outdoor wood burning oven
            definition, 113846
            requirements, 114143
Overhead protection, 113984.e
Oysters, see Shellfish and shellstock

P
Pallets, moveability, 114165
Pass-thru window service openings, 114259.2
Pasteurized foods, 114091

            egg and milk products, 114024
Pasteurized egg, substitute for raw, 114012
Permanent Food Facilities

            definition, 113849
            floors, walls, and ceilings

                        enclosure requirement , 114266
                        floors, cleaning with dustless methods, 114268.1
                        floors, construction and material, 114268.a
                        floors, coving, 114268.b
                        floor covering, mats and duckboards, 114272
                        floor drains, installation requirement, 114269
                        requirements, 114265, 114289
            janitorial facilities, see Janitorial facilities
                        living or sleeping quarters, separation and use, 114285,
                        114286
                        location, 114276.b.2
                        toilet and handwashing facilities for employees and patrons,
                        114276
                        walls and ceilings, 114271
            toilet facilities
                        doors, 114276.c
                        handwashing facilities, 114276.d
Permit, definition, 113851
Permit holder, definition, 113853
Permit Suspension or Revocation, 114405
            immediate closure, 114409
            notice of hearing decision, 114407
            permit reinstatement or reissuance, 114413
            serious or repeated violations, interference, 114411
Person, definition, 113855
Person in charge
            definition, 113856

                                               228
            designation, 113945
            responsibilities, 113945.1, 113949.1, 113949.5, 113950, 113950.5,
            114065.i
Personal care items, definition, 113859.
Personal/ Employee Cleanliness
            clothing , 113971
            fingernails, 113968
            food contamination by employees, 113967
            hair restraints, 113969
Pesticides, see Poisonous and toxic materials
pH, definition, 113861
Plan review and permits
            nonconforming structural conditions, 114380.c.2
            permits, fees and permit posting, 114381
            permit requirements for an organizer, 114381.1
            permit requirements for compact mobile food operations, 114381.3
            permit requirements for temporary food facilities, 114381.2
            permit required; penalties, 114387
            plan review, 114380
            schools, 114380.c.1
Plumbing fixture, definition, 113863
Plumbing system
            definition, 113865.
            approved plumbing system, 114190
Poisonous and Toxic Materials
            definition, 113867
            identification requirements, 114254.1
            mobile food facility, 114319
            reuse of containers, 114254.3.
            separation from food, 114254.2
            use and storage, 114254
Portable, definition, 113868
Potable water
            definition, 113869
            standards / enforcement, 114189
Potentially hazardous food, definition, 113871
            potentially hazardous food, 113871.c.2
Poultry, definition, 113873
Pre-cleaning, warewashing, 114099.1
Premises, definition, 113874
Premises (see also Equipment)
            living or sleeping quarters, separation and use, 114285, 114286
            maintenance, 114257.1
Prepackaged food, definition, 113876
Preparation, diligent, 113998
Preparation sink, requirements, 114163
Pressurized cylinders, 114172

                                               229
Primary responsibility for enforcement, 113713
Probe thermometer, 114159
Produce

            definition, 113877
            washing, 113992
Produce stand, definition, 113879
Producer, definition, 113880
Protection from contamination
            condiments, 114077
            contamination by employees, 113967
            contamination of work area, 113984
            equipment storage (washer, dryer, storage cabinets), 114161
            food preparation area, 113984
            food preparation area, consumer access, 113984.1
            food transportation, 113982
            ice as coolant prohibited as ingredient, 113990
            protection from unapproved additives, 113988
            requirements for food, 113980, 113986
            tasting, 113976
            washing produce, 113992

Q
Quaternary ammonia sanitization, 114099.6.c.3

R
Racks, moveability, 114165
Ratites, examples, 113795.c
Ready-to-eat food

            definition, 113881
            handling, 113961
Receipt of food
            inspection upon receipt, 114035
            shell eggs, 114041
            shellstock identification, 114039.1
            shucked shellfish, packaging and identification, 114039.1-114039.5
            temperatures, 114037
Reduced oxygen packaging
            definition, 113883
            criteria, 114057.1
            date coding, 114057
            HACCP requirement, 114419.b.2
Refills/second portions, 114075
Refrigeration unit
            definition, 113885
            monitoring thermometer, 114157
Refuse
            cleaning receptacles, 114245.6

                                               230
            definition, 113887
            disposal of refuse, 114245.1
            indoor/outdoor refuse area, construction, 114245.3-114245.4
            outside receptacle, installation, 114245.5
            receptacle area, location, 114245
            receptacles, capacity and availability, 114244.
            refuse cleaning implements / supplies, 114245.7
Reheating
            hot holding, 114016
            preparation for immediate service, 114014
Remodel, definition, 113889
Reportable, food employee, see Employee health
Re-service and prohibited foods/highly susceptible populations, 114079, 114091
Residential care facilities for the elderly, see Child day care facilities, community
            care facilities and residential care facilities for the elderly
Restrict, definition, 113894
Restricted food service facility, definition, 113893
Restrooms, see Toilet facilities
Retail, definition, 113895
Retail food safety and defense fund, 113718
Returned empty containers, cleaning for refilling, 114121
Returned food, re-service of food, 114079
Returns, defective/returnable merchandise, 114055
Reuse of containers, see Equipment and utensils, returnables

S
Salad bar

            holding temperatures, 113996.c.4
            refills/reuse of tableware, 114075
            requirements, 114063.d & e
            utensils, cleaning frequency, 114117
Sales limitation, farm stands, 114375.c
Sampling, certified farmers'' markets/farm stands, 114371
Sanitization
            definition, 113897
            drying agents, 114109
            equipment, CIP, 114130.5
            frequency, food contact surfaces, 114117
            manual sanitization, 114099.6
            mechanical sanitization, 114099.7
Satellite food service
            definition, 113899
            requirements, 114067
Schools, see Highly susceptible populations
Screen
            pass-thru window, 114259.3
            temporary food facility enclosure, 114349

                                               231
            water tank vent, 114213
Sealed, definition, 113901
Self-service, 114063

            bulk beverage dispensers, 114065
            food display, 114067
            utensils, 114081
Service animal, definition, 113903
Sharing tables, 114079.c
Shell eggs, see Eggs

Shellfish and shellstock
            molluscan shellfish, definition, 113835
            molluscan shellfish, original container, 114039.3
            molluscan shellfish tanks, 114039.5
            packaging and identification, 114039
            receiving temperatures, live, 114037.c
            shellfish certification number, definition, 113907
            shellfish control authority, definition, 113909
            shellstock, definition, 113911
            shellstock, condition, 114039.2
            shellstock identification, 114039.1
            shellstock, maintaining identification, 114039.4
            shucked shellfish, definition, 113912

Signs
            handwashing, 113953.5
            no smoking, 113978

Single-use articles
            definition, 113914.
            characteristics, 114130.2
            milk dispensing tube, 114073
            storage, 114178
            storage prohibitions, 114179
            temporary food facilities, 114353

Sleeping quarters, 114285, 114286
Smoking for food preservation, HACCP requirement, 114419.1
Smooth, definition, 113916
Sneeze guards, 114060
Splashguard

            handwashing sink, 113953.b.2, 114113.b
Sponges, use limitation, 114135
Storage area, employees, see Employee storage area
Storage, food, see Food storage
Storage of equipment and utensils, see Equipment and utensils
Storage of janitorial supplies, see Janitorial facilities
Surfaces, cutting, 114177
Swap meet

            definition, 113917

                                               232
            permit requirements, 114381.1

T
Table-mounted equipment, definition, 113924
Tableware

            definition, 113926
            handling of kitchenware, tableware, 114081
            preset, 114074
            second portions/refills, 114075
            soiled tableware, 114083
Tasting, 113976
Temperature, holding, see Holding temperatures
Temporary food facility
            definition, 113930
            alternate handwashing facilities, 114358
            applicable requirements, 114335
            barbeques, grills, outdoor cooking equipment, location, 114341.b
            ceilings, overhead protection, enclosures and food compartments,
            114349
            cleaning and servicing, 114361
            enforcement officer discretion in imposing requirements, 114363
            equipment, 114354
            floors, 114347
            food from an approved source, 114339
            food preparation at Community events, 114341
            holding temperatures � potentially hazardous food, 114343
            hot and cold beverage counter, 114345
            ice, 114355
            identification of operator, 114337
            operation at Community Event, 114335.b & c
            operation at swap meet, 114335.a & d
            permit requirements, 114381.2
            single use consumer utensils, 114353
            storage of food, utensils and related items, 114356
            toilet facilities, 114359
            warewashing facilities / shared, 114351
Test strips, 114107
Thawing, 114020
Thermometers
            monitoring thermometer, 114157
            probe thermometer, 114159.
            temperature measuring device, definition, 113928
Third-party food delivery platform
            Definition, 113930.5
            food transportation, 113982(b)
Tight-fitting, definition, 113931
Time as a public health control, 114000

                                               233
Time limits for food preparation, 113998

Tobacco, employee, 113977
Toilet facilities, 114250

            certified farmers'' markets, 114371.c
            doors, 114276.c
            farm stand, 114375.b
            handwashing facilities, 114276.d
            individual facilities within larger premises, 114250.1
            location, 114276.b.2
            mobile food facilities, 114315
            temporary food facilities, 114359
            toilet and handwashing facilities for employees and patrons, 114276
Towels, see Linens
Toxic materials, see Poisonous and toxic materials
Trade secret, 114421
Transporter, definition, 113932
Transporting food, 113982, 113996.a

U
USDA, definition, 113933
Uniforms, cleanliness required, 113971
Use by date, 114094.5
Utensil

           definition, 113934
            cleaning, see Equipment and utensils
            storage between use, 114119

V
"V" threads, use limitation, 114137
Variance

            definition, 113936
            applications, 114417.1
            compliance with variance letter, 114417.6
            contents of variance letter, 114417.3
            effect of variance letter, 114417.5
            issuance, 114417
            issuance or denial by the department, 114417.2
            suspension or revocation, 114417.7
Vending machines
            definition, 113938
            requirements, 114145
Ventilation
            heating, ventilating, air conditioning system vents, 114149.3
            mechanical exhaust ventilation, 114149.1
            requirements, 114149
            ventilation hood system, 114149.2
Vermin, definition, 113939

                                               234
Vermin infestation
            definition, 113939.1
            exclusion of vermin, 114259, 114259.1
            insect control devices, design and installation, 114259.3
            pass-thru window, 114259.2

Vietnamese rice cakes, exemption, 114429.3

W
Walls and ceilings

            acoustical paneling use, 114271.c
            attached components, cleaning requirement, 114271.e
            conduits, 114271.d
            exemptions, 114271.b
            requirements, 114271.a
Warewashing and warewashing facilities
            definition, 113940
            data plate operating specifications, 114101.1

                 temperature measuring devices, 114101.2
                 mechanical Sanitization, 114099.6
            drainboards for warewashing equipment, 114103
            equipment and utensils, air-drying required, 114105
                  sanitizing solutions, testing devices, 114107
            dry cleaning methods, 114111
            drying agents, criteria, 114109
            facilities for temporary food facilities, 114351
            heat sanitization, 114099.4, 114099.6.a, 114099.7.a
                 temperature measuring devices, 114099.5
            maintenance tools cleaning, preventing contamination, 114123
            manual sanitization, 114099.6
            manual warewashing, 114097
            manual warewashing facility requirements, 114095
            mechanical warewashing, 114097
                warewashing procedures, 114101
            pre-cleaning, 114099.1
            procedures, 114099.2
                cleaning frequency, 114117
                sink location, mobile food facilities, 114314
                requirements, 114099
                requirements for mobile food facilities, 114313
                use limitation, 114125
                washing procedures for alternative equipment, 114099.3
Warm water, definition, 113941
Washer/dryer storage, 114161.b
Waste drains separation from ice units, 114171
Waste, liquid, see Liquid waste
Waste, solid, see Refuse
Water

                                               235
            approved plumbing system, 114190
            approved water supply system, 114192
            back siphonage prevention, 114193
            backflow prevention methods, 114193.1
            boiler water additives, criteria, 114189.1
            enforcement of potable water standards, 114189
            pressure, 114192.1
            reservoir, fogging device, 114180
            source, hot water capacity, 114195
Water activity, see a w
Water heater
            hot water supply, 114192

                system capacity, 114195
                mobile food facilities, 114325
Water reservoir of fogging devices, 114180
Wine tasting, 113789
Wiping cloths, see Linens
Wood as food contact surface, use limitation, 114132
Wood burning oven, outdoor
            definition, 113846
            requirements, 114143
X
Y
Z

**This document is updated
directly from approved legislation
as written.

                                               236
                     CALIFORNIA CONFERENCE
                                       OF

          DIRECTORS OF ENVIRONMENTAL HEALTH

            CALCODE ORDER FORM for book
                  Effective January 1, 2026

      CALCODE is available in two forms that can be purchased online at
www.ccdeh.org under the Storefront. You may either purchase books or a pdf

                            file that includes current legislation.

          � AB 592 Business; retail food (open kitchens)

          � AB 671 Accelerated restaurant building plan approval:

            California Retail food code: tenant improvements

          � SB 68 Major food allergens

          � SB 635 Food vendors and facilities: enforcement activities

Please pay online or complete this order form:

QUANTITY                                                                     TOTAL

_________ CALCODE pdf emailed at $50.00 each                                 $ ____________

_________ CALCODE Booklet at $20.00 each                                     $ ____________

Sales Tax @ Your County''s Tax Rate = _______%                                $ ____________

          Shipping & Handling rates

          US mail 1st Class           = $ 4.47 per book $ ____________

          USPS Regional Box           = $ 12.95 per 10 $ ____________

          USPS Regional Box           = $ 21.95 per 20 $ ____________

Out of State, Express mail or larger purchases please call for actual cost.

                                                TOTAL DUE = $ ____________

PLEASE SEND MY ORDER TO:

_______________________________________________________________

Name                                            Organization/Business

_______________________________________________________________

Address                                         City, State, Zip

_______________________________________________________________

Phone                                           email

Return this order form and check to:            CCDEH Tax ID# 84-4814983
Or you can order and pay online at              P.O. Box 2017
www.ccdeh.org under storefront.                 Cameron Park, CA 95682-2017

If you have questions, please call (530) 676-0715 or you can send an email to:
admin@ccdeh.org.
Made from recycled paper', 'food_safety', 2026, '2026-01-01', 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=104.&part=7.', '{"chapter": "13", "chapter_title": "Compliance and Enforcement", "article": "8", "article_title": "Child Day Care Facilities, Community Care Facilities and"}'::jsonb)
ON CONFLICT (code_family, section_number, current_edition_year)
DO UPDATE SET
  short_title = EXCLUDED.short_title,
  full_text = EXCLUDED.full_text,
  metadata = EXCLUDED.metadata,
  source_url = EXCLUDED.source_url,
  effective_date = EXCLUDED.effective_date,
  updated_at = now();

-- =====================================================================
-- Apply-time verification
-- =====================================================================
DO $$
DECLARE
  _count int;
BEGIN
  SELECT COUNT(*) INTO _count FROM citations WHERE code_family = 'CalCode' AND current_edition_year = 2026;
  IF _count < 290 THEN
    RAISE EXCEPTION 'CalCode seed verification failed: expected >= 290 rows, got %', _count;
  END IF;
  RAISE NOTICE 'PASS CalCode 2026 seed — % sections loaded', _count;
END $$;
