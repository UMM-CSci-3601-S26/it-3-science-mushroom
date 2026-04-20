package umm3601.Family;
import java.util.*;

public class FamilyScheduling {

  public static void scheduleFamilies(ArrayList<String> arr, int capacity, int famSize) {
    int currCapacity = 0; // current number of people in a timeslot
    ArrayList<String> currTimeSlot = new ArrayList<>(capacity);
    for (int i = 1; i < 5; i++) // run 4 times, once for each timeslot
    {
    // goes through each family of array and adds them to first available timeslot
      for (int j = 0; currCapacity < capacity && j <= arr.size(); j++)
      {
        if (currCapacity + famSize <= capacity) // checks if the family fits within the capacity restraints of the bin
        {
          currTimeSlot.add(arr.get(j)); // adds family to the timeslot
          currCapacity += famSize; // adds the number of people in the family to the capacity
          arr.remove(j); // removes the family from the list
        }
      }
    }
  }
}
