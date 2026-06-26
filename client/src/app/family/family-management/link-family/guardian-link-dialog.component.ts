import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatDialogContent, MatDialogActions, MatDialogClose } from "@angular/material/dialog";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { FamilyService } from "../../family.service";
import { Family } from "../../family";
import { User, UserService } from "src/app/users/user.service";

@Component({
  selector: 'app-guardian-link-dialog',
  templateUrl: './guardian-link-dialog.component.html',
  styleUrls: ['./guardian-link-dialog.component.scss'],
  imports: [MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatInput,
    MatLabel,
    MatFormField,
    FormsModule,
    MatAutocompleteModule]
})

export class GuardianLinkDialogComponent implements OnInit {

  private familyService = inject(FamilyService);
  private userService = inject(UserService)
  families: Family[] = [];
  guardianUsers: User[] = [];

  ngOnInit() {
    this.familyService.getFamilies().subscribe(families => {
      this.families = families;
    });

    this.userService.getGuardianUsers().subscribe(users => {
      this.guardianUsers = users;
    });
  }

  familySearch = '';
  guardianSearch = '';


  filteredFamilies() {
    const search = this.familySearch.toLowerCase();

    return this.families.filter(family =>
      family.guardianName.toLowerCase().includes(search)
    )
  }

  filteredGuardian() {
    const search = this.guardianSearch.toLowerCase();

    return this.guardianUsers.filter(guardian =>
      guardian.fullName.toLowerCase().includes(search) ||
      guardian.username.toLowerCase().includes(search) ||
      (guardian.email ?? '').toLowerCase().includes(search)
    );
  }
}
