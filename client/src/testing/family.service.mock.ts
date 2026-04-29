import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { Family, SelectOption } from '../app/family/family';
import { FamilyService } from 'src/app/family/family.service';

@Injectable({
  providedIn: AppComponent
})
export class MockFamilyService implements Pick<FamilyService, 'getFamilyById' | 'familyOptions' | 'getDashboardStats' | 'getFamilies' | 'exportFamilies' | 'addFamily' | 'deleteFamily' | 'generatePDF'> {
  //'getFamily' |
  // getFamilies: FamilyService;
  static testFamilies: Family[] = [
    {
      //family with one kid
      _id: 'john_id',
      ownerUserId: 'john-user-id',
      guardianName: 'John Johnson',
      email: 'jjohnson@email.com',
      address: '713 Broadway',
      accommodations: 'None',
      timeSlot: '8:00-9:00',
      timeAvailability: {
        earlyMorning: false,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: false
      },
      students: [
        {
          name: 'John Jr.',
          grade: '1',
          school: "Morris Elementary",
          schoolAbbreviation: "ME",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
      ]
    },
    {
      //family with two kids
      _id: 'jane_id',
      guardianName: 'Jane Doe',
      email: 'janedoe@email.com',
      address: '123 Street',
      accommodations: 'None',
      timeSlot: '10:00-11:00',
      timeAvailability: {
        earlyMorning: false,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: false
      },
      students: [
        {
          name: 'Jennifer',
          grade: '6',
          school: "Hancock Middle School",
          schoolAbbreviation: "HMS",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
        {
          name: 'Jake',
          grade: '8',
          school: "Hancock Middle School",
          schoolAbbreviation: "HMS",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
      ]
    },
    {
      //family with three kids
      _id: 'george_id',
      ownerUserId: 'george-user-id',
      guardianName: 'George Peterson',
      email: 'georgepeter@email.com',
      address: '245 Acorn Way',
      accommodations: 'None',
      timeSlot: '1:00-2:00',
      timeAvailability: {
        earlyMorning: false,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: false
      },
      students: [
        {
          name: 'Harold',
          grade: '11',
          school: "Morris High School",
          schoolAbbreviation: "MHS",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
        {
          name: 'Thomas',
          grade: '6',
          school: "Morris High School",
          schoolAbbreviation: "MHS",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
        {
          name: 'Emma',
          grade: '2',
          school: "Morris Elementary",
          schoolAbbreviation: "ME",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
      ]
    },
  ];

  private readonly family = signal<Family[]>(MockFamilyService.testFamilies);

  familyOptions = computed<SelectOption[]>(() =>
    [...new Set(this.family().map(i => i.guardianName).filter(v => v !== ''))]
      .map(value => ({ label: value, value}))
  );

  getDashboardStats() {
    const studentsPerSchool: { [school: string]: number } = {};
    const studentsPerGrade: { [grade: string]: number } = {};
    let totalStudents = 0;

    MockFamilyService.testFamilies.forEach(family => {
      family.students.forEach(student => {
        studentsPerSchool[student.school] =
        (studentsPerSchool[student.school] ?? 0) + 1;

        studentsPerGrade[student.grade] =
        (studentsPerGrade[student.grade] ?? 0) + 1;

        totalStudents = totalStudents + 1
      });
    });

    return of({
      studentsPerSchool,
      studentsPerGrade,
      totalFamilies: MockFamilyService.testFamilies.length,
      totalStudents
    });
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  getFamilies(_filters: {guardianName?: string }): Observable<Family[]> {
    return of(MockFamilyService.testFamilies);
  }

  getFamilyById(id: string): Observable<Family> | null {
    if (id === MockFamilyService.testFamilies[0]._id) {
      return of(MockFamilyService.testFamilies[0]);
    } else if (id === MockFamilyService.testFamilies[1]._id) {
      return of(MockFamilyService.testFamilies[1]);
    } else {
      return of(null);
    }
  }

  addFamily(newFamily: Partial<Family>): Observable<string> {
    console.log('deleteFamily called with', newFamily);
    return of('1');
  }

  updateFamily(id: string, updatedFamily: Partial<Family>): Observable<string> {
    console.log('updateFamily called with', id, updatedFamily);
    return of('1');
  }

  deleteFamily(id: string): Observable<void> {
    console.log('deleteFamily called with', id);
    //added above line so that "id" was being used
    return of(void 0);
  }

  exportFamilies(): Observable<string> {
    return of('csv-data');
  }

  generatePDF(): void {
    console.log('generatePDF called');
  }

  requestFamilyDelete(id: string, message: string): Observable<unknown> {
    console.log('requestFamilyDelete called with', id, message);
    return of({ success: true });
  }

  getDeleteRequests(): Observable<Family[]> {
    return of(MockFamilyService.testFamilies.filter(f => f.deleteRequest?.requested));
  }

  restoreDeleteRequest(id: string): Observable<unknown> {
    console.log('restoreDeleteRequest called with', id);
    return of({ success: true });
  }
}
